# Twenty CRM (oa-crm) — Production Deployment Guide

End-to-end checklist to promote **oa-crm** from the working UAT setup to **prod**. Follow phases in order. Do not skip Cloud SQL + secrets — the app will not start without them.

> **Prerequisite:** UAT is already deployed and healthy at `https://crm.uat.corp.non-prod.oneassure.in`. This guide assumes chart `oa-crm` (≥ `0.1.1` with `podSecurityContext`), Jenkins UAT job, and ArgoCD team `oa-crm` already exist for non-prod.

---

## Glossary

| Term | Prod meaning |
|------|----------------|
| **GCP project** | `oneassure-prod` |
| **Artifact Registry** | `asia-south1-docker.pkg.dev/oneassure-prod/oneassure` |
| **Image name** | `oa-crm-prod` |
| **Helm chart bucket** | `gs://oa-charts` (not `oa-charts-non-prod`) |
| **Cloud SQL** | `csql-asia-south1-postgres_14.corp.oneassure.in:5432` |
| **K8s namespace** | `oa-crm` (on the **prod** GKE cluster) |
| **ArgoCD branch** | `oa-infra` → `argocd` |
| **helm-values branch** | `main` |
| **VPN** | Required for `*.corp.oneassure.in` |

---

## Architecture (prod)

```mermaid
flowchart LR
  Jenkins[Jenkins Freestyle prod] --> AR["Artifact Registry\noa-crm-prod:tag"]
  Dev[You] --> HV[helm-values main]
  Dev --> Infra[oa-infra argocd]
  Dev --> GCS["gs://oa-charts\noa-crm chart"]
  ArgoCD[ArgoCD prod] --> GCS
  ArgoCD --> HV
  ArgoCD --> App[oa-crm-application-prod]
  App --> NS[namespace oa-crm]
  NS --> SQL["Cloud SQL twenty DB"]
  NS --> Redis[bitnami-redis]
```

---

## Phase 0 — Confirm decisions with DevOps

Before writing configs, confirm:

| Item | Suggested default | Confirm with DevOps |
|------|-------------------|---------------------|
| Public/private hostname | `https://crm.corp.oneassure.in` | **Important:** Frappe/ERP docs also mention `crm.corp.oneassure.in`. If that host is taken, pick another (e.g. `twenty.corp.oneassure.in` / `oa-crm.corp.oneassure.in`) |
| Gateway | `gke-gateway-pvt-prod` in `entrypoint-pvt` | Same pattern as CMS prod |
| Prod GKE context name | e.g. `gke-prod` | Ask DevOps |
| Cloud SQL DB name | `twenty` (dedicated; do **not** reuse sales/leads) | Yes |
| Redis | Shared Bitnami in prod cluster | `redis://redis-master.bitnami-redis.svc.cluster.local:6379` |
| Jenkins branch for prod | `main` (or `master`) | Same pattern as oa-website prod |
| Chart version in prod bucket | Same as non-prod (e.g. `0.1.1`) or bump if templates changed | — |

Replace `crm.corp.oneassure.in` everywhere below if DevOps gives a different hostname.

---

## Phase 1 — Tools & cluster access

```bash
# VPN connected
gcloud auth login
gcloud config set project oneassure-prod

# Point kubectl at prod GKE (exact command from DevOps)
kubectl config get-contexts
kubectl config use-context <PROD_GKE_CONTEXT>
kubectl get ns
```

Install locally if needed: `gcloud`, `kubectl`, `psql`, `helm`, `helm-gcs` plugin, `gsutil`.

---

## Phase 2 — Cloud SQL (prod): database + roles

### 2.1 Connect as admin (VPN on)

```bash
export PGHOST=csql-asia-south1-postgres_14.corp.oneassure.in
export PGPORT=5432
export PGUSER=admin          # or the prod admin role name from Secret Manager
export PGDATABASE=postgres
# PGPASSWORD from Secret Manager in oneassure-prod (ask DevOps for secret name)

psql -c 'SELECT version();'
```

### 2.2 Create roles + database `twenty`

Prefer your org script (`pg-scripts/wrapper.sh`) against **prod** Cloud SQL if DevOps supports it.

Manual fallback (Cloud SQL–safe order):

```sql
-- As admin
CREATE ROLE app_owner_twenty WITH LOGIN PASSWORD '<OWNER_PASSWORD>';
CREATE ROLE app_user_twenty  WITH LOGIN PASSWORD '<USER_PASSWORD>';

CREATE DATABASE twenty OWNER app_owner_twenty;

\c twenty

GRANT CONNECT ON DATABASE twenty TO app_user_twenty;
GRANT USAGE ON SCHEMA public TO app_user_twenty;
-- Plus whatever grants your wrapper normally applies for app_user
```

Save the **owner** password securely. Twenty needs **`app_owner_twenty`** in `PG_DATABASE_URL` (migrations need DDL).

### 2.3 Verify owner login

```bash
PGPASSWORD='<OWNER_PASSWORD>' psql \
  -h csql-asia-south1-postgres_14.corp.oneassure.in \
  -U app_owner_twenty -d twenty \
  -c 'SELECT current_user, current_database();'
```

Expected: `app_owner_twenty | twenty`.

### 2.4 URL-encode the owner password

```bash
python3 -c "import urllib.parse; print(urllib.parse.quote('OWNER_PASSWORD_HERE', safe=''))"
```

---

## Phase 3 — Kubernetes secret (prod)

```bash
kubectl config current-context   # must be prod
kubectl create namespace oa-crm  # optional; Argo has CreateNamespace=true

# Generate fresh secrets for prod (do NOT reuse UAT ENCRYPTION_KEY / APP_SECRET)
python3 - <<'PY'
import secrets, base64
print("ENCRYPTION_KEY=", base64.b64encode(secrets.token_bytes(32)).decode())
print("APP_SECRET=", secrets.token_urlsafe(32))
PY
```

```bash
kubectl create secret generic oa-crm-secret-prod \
  --namespace=oa-crm \
  --from-literal=PG_DATABASE_URL='postgresql://app_owner_twenty:ENCODED_OWNER_PASSWORD@csql-asia-south1-postgres_14.corp.oneassure.in:5432/twenty' \
  --from-literal=ENCRYPTION_KEY='...' \
  --from-literal=APP_SECRET='...'
```

Verify keys only (do not dump values into chat/Git):

```bash
kubectl get secret oa-crm-secret-prod -n oa-crm \
  -o jsonpath='{range $k,$v := .data}{$k}{"\n"}{end}'
```

Expect: `APP_SECRET`, `ENCRYPTION_KEY`, `PG_DATABASE_URL`.

**Never** put secret values in `helm-values`. Values only map env names → secret keys.

---

## Phase 4 — `deploy.sh` (already supports prod)

File: [`scripts/deploy.sh`](../scripts/deploy.sh) in `twenty-crm`.

It already:

- Accepts `uat` | `prod`
- Builds `--target twenty` from `packages/twenty-docker/twenty/Dockerfile`
- Pushes:
  - UAT → `asia-south1-docker.pkg.dev/oneassure-non-prod/oneassure-non-prod/oa-crm-uat:<tag>`
  - Prod → `asia-south1-docker.pkg.dev/oneassure-prod/oneassure/oa-crm-prod:<tag>`
- Prints `IMAGE_TAG` for pasting into helm-values (does **not** auto-commit)

### Optional improvement

Update the trailing echo so prod prints the correct path:

```text
core-services/teams/oa-crm/prod/prod/image-tag.yaml
```

instead of only the UAT path. Behaviour of build/push does not need to change.

### Local smoke (optional)

```bash
cd twenty-crm
./scripts/deploy.sh prod
# Requires Docker + gcloud auth to oneassure-prod Artifact Registry
```

Prefer running via Jenkins (next phase).

---

## Phase 5 — Jenkins Freestyle job (prod)

Mirror the **UAT** Freestyle job (same pattern as oa-website), with prod-specific settings.

### 5.1 Create job

1. Jenkins → New Item → Freestyle project  
   Suggested name: `oa-crm-prod` (or your naming convention).
2. **Source Code Management → Git**
   - Repo: `https://github.com/oneassure-tech/twenty-crm.git` (or SSH equivalent)
   - Branch specifier: `*/main` (or `*/master` — match your release branch)
3. **Build Environment**
   - Use the same agent / Node label as other **prod** image builds (Docker + gcloud SDK).
4. **Build → Execute shell**

```bash
set -ex
./scripts/deploy.sh prod
set +ex
```

5. Save.

### 5.2 Permissions / registry

Ensure the Jenkins service account can:

- `docker push` to `asia-south1-docker.pkg.dev/oneassure-prod/oneassure`
- Read the `twenty-crm` Git repo

### 5.3 First build

1. Run the job on the release commit you want in prod.
2. From console output, copy:

```text
IMAGE_TAG (paste into helm-values image-tag.yaml):
<main-or-branch>-<sha>-<timestamp>
```

3. Confirm image exists:

```bash
gcloud artifacts docker images list \
  asia-south1-docker.pkg.dev/oneassure-prod/oneassure/oa-crm-prod \
  --include-tags --limit=5
```

---

## Phase 6 — Publish Helm chart to **prod** bucket

ArgoCD prod reads `gs://oa-charts`, not `gs://oa-charts-non-prod`.

### 6.1 Package (from chart source)

```bash
cd oa-charts/oa-crm
# Chart.yaml version must match what ApplicationSet will pin (e.g. 0.1.1)
helm dependency build .
helm package .
# → oa-crm-0.1.1.tgz
```

### 6.2 Push safely (preferred: helm-gcs)

```bash
gcloud config set project oneassure-prod   # or whichever project owns the bucket
cd oa-charts
helm repo add oa-charts gs://oa-charts   # once
helm gcs push oa-crm/oa-crm-0.1.1.tgz oa-charts --force
```

### 6.3 Verify

```bash
helm repo update
helm search repo oa-charts/oa-crm --versions
# Expect version 0.1.1 (or whatever you published)
```

> Prefer **bumping** chart version on template changes. Do not silently overwrite the same version unless you are sure Argo cache will refresh.

---

## Phase 7 — helm-values (prod)

Create this tree on branch **`main`**:

```text
helm-values/core-services/teams/oa-crm/
  non-prod/          # already exists (UAT)
  prod/
    common/values.yaml
    prod/values.yaml
    prod/image-tag.yaml
```

This matches the oa-website prod layout (`prod/common` + `prod/prod`).

### 7.1 `prod/common/values.yaml`

```yaml
env: prod

image:
  repository: asia-south1-docker.pkg.dev/oneassure-prod/oneassure
  image: oa-crm-prod

replicaCount: 2

workerDeployment:
  enabled: true
  replicaCount: 1
  assignResource: true
  resources:
    limits:
      cpu: 1000m
      memory: 2048Mi
    requests:
      cpu: 250m
      memory: 1024Mi
  extraEnv:
    - name: DISABLE_DB_MIGRATIONS
      value: "true"
    - name: DISABLE_CRON_JOBS_REGISTRATION
      value: "true"

ports:
  - containerPort: 3000
    name: app
    protocol: TCP

assignResource: true
resources:
  limits:
    cpu: 1000m
    memory: 1536Mi
  requests:
    cpu: 250m
    memory: 512Mi

probes:
  readinessProbe:
    httpGet:
      path: /healthz
      port: app
  livenessProbe:
    httpGet:
      path: /healthz
      port: app

configMap:
  create: true
  assignEnv: true

secret:
  assignEnv: true

persistence:
  enabled: true
  size: 20Gi

podSecurityContext:
  fsGroup: 1000
  runAsUser: 1000
  runAsGroup: 1000

service:
  ports:
    - name: app
      targetPort: app
      port: 80
```

Notes:

- `podSecurityContext` is required so local storage PVC is writable (UID 1000).
- Worker disables migrations/cron registration (server owns those).
- Tune `replicaCount` / resources with DevOps if needed.

### 7.2 `prod/prod/values.yaml`

```yaml
env: prod

configMap:
  data:
    NODE_PORT: "3000"
    SERVER_URL: https://crm.corp.oneassure.in
    REDIS_URL: redis://redis-master.bitnami-redis.svc.cluster.local:6379
    STORAGE_TYPE: local
    SIGN_IN_PREFILLED: "false"

secret:
  name: oa-crm-secret
  data:
    - name: PG_DATABASE_URL
      key: PG_DATABASE_URL
    - name: ENCRYPTION_KEY
      key: ENCRYPTION_KEY
    - name: APP_SECRET
      key: APP_SECRET

httpRoute:
  create: true
  routes:
    - parentRefs:
        - kind: Gateway
          name: gke-gateway-pvt-prod
          namespace: entrypoint-pvt
      hostnames:
        - "crm.corp.oneassure.in"
      rules:
        - matches:
            - path:
                type: PathPrefix
                value: "/"
          backendRefs:
            - name: oa-crm-service-prod
              port: 80

healthCheck:
  create: true
  checkIntervalSec: 55
  timeoutSec: 15
  healthyThreshold: 1
  unhealthyThreshold: 2
  logEnabled: false
  type: HTTP
  httpHealthCheck:
    port: 3000
    requestPath: /healthz
  targetServiceName: oa-crm-service
```

Chart resolves secret name as `{{ secret.name }}-{{ env }}` → **`oa-crm-secret-prod`**.

### 7.3 `prod/prod/image-tag.yaml`

```yaml
image:
  tag: <PASTE_JENKINS_PROD_TAG_HERE>
```

Use the exact tag from the Jenkins prod console (not `latest`).

### 7.4 Push

```bash
cd helm-values
git checkout main
git pull
git add core-services/teams/oa-crm/prod/
git commit -m "Add oa-crm prod helm values for Twenty CRM"
git push origin main
```

---

## Phase 8 — oa-infra ArgoCD (prod overlays)

Non-prod already has:

```text
oa-infra/argocd/services/teams/oa-crm/
  base/
  overlays/non-prod/
  app-project/base/
  app-project/overlays/non-prod/
```

Add **prod** overlays (same pattern as oa-website / oa-cms).

### 8.1 ApplicationSet overlay — `overlays/prod/`

**`overlays/prod/kustomization.yaml`**

```yaml
bases:
- ../../base

patches:
- path: ./source-repo-url-patch.yaml
  target:
    kind: ApplicationSet
    name: argo-oa-crm-application-set

- path: ./list-generator-patch.yaml
  target:
    kind: ApplicationSet
    name: argo-oa-crm-application-set

- path: ./helm-value-files-patch.yaml
  target:
    kind: ApplicationSet
    name: argo-oa-crm-application-set
```

**`overlays/prod/list-generator-patch.yaml`**

```yaml
- op: add
  path: /spec/generators/0/list/elements
  value:
  - environment: prod
```

**`overlays/prod/source-repo-url-patch.yaml`**

```yaml
- op: add
  path: /spec/template/spec/sources
  value:
    - repoURL: gs://oa-charts
      chart: oa-crm
      targetRevision: 0.1.1
      helm:
        releaseName: "oa-crm"
        valueFiles:
          - $values/core-services/teams/oa-crm/prod/common/values.yaml
          - $values/core-services/teams/oa-crm/prod/{{.environment}}/values.yaml
          - $values/core-services/teams/oa-crm/prod/{{.environment}}/image-tag.yaml

    - repoURL: "https://github.com/oneassure-tech/helm-values"
      targetRevision: main
      ref: values
```

> If base already defines empty `sources: []`, `op: add` matches non-prod. If you later share one ApplicationSet across envs differently, follow whatever pattern DevOps prefers. For a **prod-only** overlay on the prod ArgoCD instance, this mirrors website.

**`overlays/prod/helm-value-files-patch.yaml`** (optional if already set in source-repo patch)

Only needed if you split patches like oa-website. If `valueFiles` are fully set in `source-repo-url-patch.yaml`, you can omit this file and remove it from `kustomization.yaml`.

If you keep it (website style replace):

```yaml
- op: replace
  path: /spec/template/spec/sources/0/helm/valueFiles
  value:
  - $values/core-services/teams/oa-crm/prod/common/values.yaml
  - $values/core-services/teams/oa-crm/prod/{{.environment}}/values.yaml
  - $values/core-services/teams/oa-crm/prod/{{.environment}}/image-tag.yaml
```

### 8.2 AppProject overlay — `app-project/overlays/prod/`

**`app-project/overlays/prod/kustomization.yaml`**

```yaml
bases:
- ../../base

patches:
- path: ./source-repo-patch.yaml
  target:
    kind: AppProject
    name: argo-oa-crm-app-project
```

**`app-project/overlays/prod/source-repo-patch.yaml`**

```yaml
- op: add
  path: /spec/sourceRepos/0
  value: gs://oa-charts
```

Base already allows `helm-values` + `oa-infra` and destination namespace `oa-crm`. Prod overlay adds the **prod** chart bucket.

### 8.3 Bootstrap init (prod ArgoCD)

Create:

`oa-infra/argocd/bootstrap/argocd-init/prod/services-kustomizations-init/oa-crm-team-init-application.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: bootstrap-oa-crm-team-init-application
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
  labels:
    argocd.oneassure.in/scope: bootstrap
spec:
  project: bootstrap-project
  sources:
    - repoURL: https://github.com/oneassure-tech/oa-infra
      targetRevision: argocd
      path: argocd/services/teams/oa-crm/overlays/prod

    - repoURL: https://github.com/oneassure-tech/oa-infra
      targetRevision: argocd
      path: argocd/services/teams/oa-crm/app-project/overlays/prod

  destination:
    server: https://kubernetes.default.svc
    namespace: argocd

  syncPolicy:
    automated: {}
    retry:
      limit: 5
      backoff:
        duration: 9s
        factor: 2
        maxDuration: 6m
  revisionHistoryLimit: 10
```

Prod bootstrap parent already recursively loads `services-kustomizations-init/` (same idea as non-prod) — adding this file is enough; no extra kustomization edit.

### 8.4 Validate locally

```bash
kubectl kustomize oa-infra/argocd/services/teams/oa-crm/overlays/prod
kubectl kustomize oa-infra/argocd/services/teams/oa-crm/app-project/overlays/prod
```

Confirm: `environment: prod`, chart `oa-crm@0.1.1` from `gs://oa-charts`, valueFiles under `.../oa-crm/prod/...`, AppProject sourceRepo includes `gs://oa-charts`.

### 8.5 Push

```bash
cd oa-infra
git checkout argocd
git pull
git add argocd/services/teams/oa-crm/overlays/prod \
        argocd/services/teams/oa-crm/app-project/overlays/prod \
        argocd/bootstrap/argocd-init/prod/services-kustomizations-init/oa-crm-team-init-application.yaml
git commit -m "Add oa-crm ArgoCD prod ApplicationSet and bootstrap"
git push origin argocd
```

---

## Phase 9 — DNS / gateway

Ask DevOps to ensure:

1. DNS for `crm.corp.oneassure.in` (or chosen host) points at the **prod private gateway**.
2. Gateway `gke-gateway-pvt-prod` can attach the HTTPRoute from namespace `oa-crm`.
3. TLS/cert as per other `*.corp.oneassure.in` apps.

---

## Phase 10 — Sync & verify

1. In **prod** ArgoCD UI, sync / wait for `bootstrap-oa-crm-team-init-application`.
2. Confirm AppProject `argo-oa-crm-app-project` and ApplicationSet `argo-oa-crm-application-set`.
3. Confirm Application **`oa-crm-application-prod`** appears and syncs Healthy/Synced.
4. Pods:

```bash
kubectl get pods,svc,httproute,pvc -n oa-crm
kubectl logs -n oa-crm deploy/oa-crm-deployment-prod --tail=100
kubectl logs -n oa-crm deploy/oa-crm-worker-deployment-prod --tail=50
```

5. Health:

```bash
curl -sk https://crm.corp.oneassure.in/healthz
```

6. Browser (VPN): open `https://crm.corp.oneassure.in`, complete first workspace signup.

### Common failures (from UAT lessons)

| Symptom | Fix |
|---------|-----|
| `password authentication failed for user "app_owner_twenty"` | Wrong/unencoded password in `PG_DATABASE_URL`; fix secret + rollout restart |
| `EACCES ... .local-storage` | Missing `podSecurityContext` fsGroup 1000; chart ≥ 0.1.1 + values |
| `ImagePullBackOff` | Wrong tag / registry / project; fix `image-tag.yaml` |
| `CreateContainerConfigError` | Secret `oa-crm-secret-prod` missing or wrong keys |
| Chart not found | Chart not in `gs://oa-charts` or wrong `targetRevision` |
| Argo still on old chart | Bump version; don’t rely on overwriting same version |

```bash
kubectl rollout restart deploy -n oa-crm
```

---

## Phase 11 — Ongoing releases (prod)

1. Merge release to `main` (or agreed branch).
2. Run Jenkins **`oa-crm-prod`** → copy new tag.
3. Update `helm-values/.../prod/prod/image-tag.yaml` → push `main`.
4. ArgoCD auto-syncs (or manual sync) `oa-crm-application-prod`.

No need to republish the Helm chart unless templates change — then bump chart version, push to `gs://oa-charts`, update ApplicationSet `targetRevision`.

---

## Checklist summary

- [ ] Hostname confirmed with DevOps (no clash with Frappe/ERP)
- [ ] Prod Cloud SQL: DB `twenty`, roles, owner login works
- [ ] Secret `oa-crm-secret-prod` in ns `oa-crm` (prod cluster)
- [ ] `deploy.sh prod` works via Jenkins Freestyle (`*/main`)
- [ ] Image in `asia-south1-docker.pkg.dev/oneassure-prod/oneassure/oa-crm-prod:<tag>`
- [ ] Chart `oa-crm@0.1.1` (or newer) in `gs://oa-charts`
- [ ] helm-values `core-services/teams/oa-crm/prod/**` on `main` with real image tag
- [ ] oa-infra prod overlays + bootstrap on `argocd` branch
- [ ] DNS + gateway ready
- [ ] Argo app `oa-crm-application-prod` Healthy
- [ ] `/healthz` OK; workspace signup works

---

## Reference: UAT vs Prod quick map

| Item | UAT | Prod |
|------|-----|------|
| GCP project | `oneassure-non-prod` | `oneassure-prod` |
| Image | `.../oneassure-non-prod/oa-crm-uat` | `.../oneassure/oa-crm-prod` |
| Chart bucket | `gs://oa-charts-non-prod` | `gs://oa-charts` |
| Values path | `.../oa-crm/non-prod/uat/` | `.../oa-crm/prod/prod/` |
| Secret | `oa-crm-secret-uat` | `oa-crm-secret-prod` |
| Cloud SQL host | `*.corp.non-prod.oneassure.in` | `*.corp.oneassure.in` |
| Gateway | `gke-gateway-pvt-non-prod` | `gke-gateway-pvt-prod` |
| URL | `crm.uat.corp.non-prod.oneassure.in` | `crm.corp.oneassure.in` (confirm) |
| Jenkins script | `./scripts/deploy.sh uat` | `./scripts/deploy.sh prod` |
| Git branch build | `develop` | `main` |
| Argo overlay | `overlays/non-prod` | `overlays/prod` |
| Bootstrap path | `argocd-init/non-prod/...` | `argocd-init/prod/...` |
