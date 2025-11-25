# Production Operations Runbook

## Daily Operations

### Morning Checks

```bash
#!/bin/bash
# Daily health check script

echo "=== EstateWise Daily Health Check ==="

# 1. Check all pods are running
echo "Pod Status:"
kubectl get pods -n estatewise

# 2. Check HPA status
echo -e "\nHPA Status:"
kubectl get hpa -n estatewise

# 3. Check recent deployments
echo -e "\nRecent Deployments (last 24h):"
kubectl get events -n estatewise --field-selector type=Normal | grep -i deploy | head -10

# 4. Check error rate (last 1 hour)
echo -e "\nError Count (last hour):"
kubectl logs -l app=estatewise-backend -n estatewise --since=1h | grep -c ERROR || echo "0"

# 5. Check resource usage
echo -e "\nResource Usage:"
kubectl top pods -n estatewise

# 6. Check PDB status
echo -e "\nPod Disruption Budgets:"
kubectl get pdb -n estatewise

echo -e "\n=== Health Check Complete ==="
```

### Weekly Tasks

1. **Review Monitoring Dashboards**
   - Check Grafana for trends
   - Review alert history
   - Identify performance patterns

2. **Backup Verification**
   ```bash
   # Check backup jobs
   kubectl get cronjob -n estatewise

   # Verify latest backup
   kubectl logs -l app=mongodb-backup -n estatewise --tail=100

   # List backups in S3
   aws s3 ls s3://your-bucket/mongodb-backups/
   ```

3. **Security Scans**
   ```bash
   # Run manual security scan
   trivy image ghcr.io/your-org/estatewise-app-backend:latest

   # Check for outdated dependencies
   npm audit --prefix backend
   npm audit --prefix frontend
   ```

4. **Capacity Planning**
   ```bash
   # Check resource trends
   kubectl top nodes
   kubectl top pods -n estatewise --sort-by=memory

   # Review HPA metrics
   kubectl get hpa -n estatewise -o yaml
   ```

---

## Deployment Procedures

### Standard Deployment

```bash
# 1. Pre-deployment checks
kubectl get pods -n estatewise
kubectl get hpa -n estatewise

# 2. Deploy new version
kubectl set image deployment/estatewise-backend \
  backend=ghcr.io/your-org/estatewise-app-backend:v1.2.3 \
  -n estatewise

# 3. Monitor rollout
kubectl rollout status deployment/estatewise-backend -n estatewise

# 4. Verify deployment
kubectl get pods -n estatewise
kubectl logs -f deployment/estatewise-backend -n estatewise

# 5. Check error rate
sleep 60
kubectl logs -l app=estatewise-backend -n estatewise --since=1m | grep -c ERROR
```

### Blue-Green Deployment

```bash
# Using deployment script
export NAMESPACE=estatewise
export AUTO_SWITCH=false
export SMOKE_TEST=true

./kubernetes/scripts/blue-green-deploy.sh backend \
  ghcr.io/your-org/estatewise-app-backend:v1.2.3
```

### Canary Deployment

```bash
# Using deployment script
export NAMESPACE=estatewise
export CANARY_STAGES=10,25,50,75,100
export STAGE_DURATION=180
export AUTO_PROMOTE=false

./kubernetes/scripts/canary-deploy.sh backend \
  ghcr.io/your-org/estatewise-app-backend:v1.2.3
```

---

## Scaling Operations

### Manual Scaling

```bash
# Scale up
kubectl scale deployment/estatewise-backend --replicas=5 -n estatewise

# Scale down
kubectl scale deployment/estatewise-backend --replicas=2 -n estatewise

# Verify
kubectl get deployment estatewise-backend -n estatewise
```

### Adjust HPA

```bash
# Edit HPA
kubectl edit hpa estatewise-backend-hpa -n estatewise

# Or patch directly
kubectl patch hpa estatewise-backend-hpa -n estatewise \
  -p '{"spec":{"maxReplicas":15}}'

# Verify
kubectl describe hpa estatewise-backend-hpa -n estatewise
```

---

## Database Operations

### Manual Backup

```bash
# Trigger manual backup job
kubectl create job --from=cronjob/mongodb-backup \
  mongodb-backup-manual-$(date +%Y%m%d-%H%M%S) \
  -n estatewise

# Monitor backup
kubectl logs -f job/mongodb-backup-manual-YYYYMMDD-HHMMSS -n estatewise
```

### Restore from Backup

```bash
# 1. Scale down backend
kubectl scale deployment/estatewise-backend --replicas=0 -n estatewise

# 2. Download backup
aws s3 cp s3://your-bucket/mongodb-backups/mongodb_backup_YYYYMMDD_HHMMSS.archive ./

# 3. Restore
kubectl run mongodb-restore --rm -it \
  --image=mongo:7.0 \
  --command -n estatewise -- \
  mongorestore --uri="$MONGO_URI" --archive=mongodb_backup_YYYYMMDD_HHMMSS.archive --gzip

# 4. Scale up backend
kubectl scale deployment/estatewise-backend --replicas=2 -n estatewise
```

### Run Database Migration

```bash
# Apply migration job
kubectl apply -f kubernetes/jobs/db-migration-job.yaml

# Monitor migration
kubectl logs -f job/db-migration -n estatewise

# Verify completion
kubectl get job db-migration -n estatewise
```

---

## Security Operations

### Rotate Secrets

```bash
# 1. Create new secret
kubectl create secret generic estatewise-secrets-new \
  --from-literal=mongoUri="mongodb://..." \
  --from-literal=jwtSecret="new-secret-$(openssl rand -base64 32)" \
  --from-literal=googleAiApiKey="..." \
  --from-literal=pineconeApiKey="..." \
  --from-literal=pineconeIndex="..." \
  -n estatewise

# 2. Update deployment to use new secret
kubectl set env deployment/estatewise-backend \
  --from=secret/estatewise-secrets-new \
  -n estatewise

# 3. Trigger rolling restart
kubectl rollout restart deployment/estatewise-backend -n estatewise

# 4. Verify
kubectl rollout status deployment/estatewise-backend -n estatewise

# 5. Delete old secret
kubectl delete secret estatewise-secrets -n estatewise

# 6. Rename new secret
kubectl get secret estatewise-secrets-new -n estatewise -o yaml | \
  sed 's/estatewise-secrets-new/estatewise-secrets/' | \
  kubectl apply -f -
```

### Update TLS Certificates

```bash
# Using cert-manager (automatic)
kubectl get certificate -n estatewise

# Manual certificate update
kubectl create secret tls estatewise-tls-new \
  --cert=path/to/cert.crt \
  --key=path/to/cert.key \
  -n estatewise

kubectl patch ingress estatewise-ingress -n estatewise \
  -p '{"spec":{"tls":[{"secretName":"estatewise-tls-new","hosts":["estatewise.example.com"]}]}}'
```

---

## Monitoring and Alerting

### Check Alert Status

```bash
# View active alerts in Prometheus
# Access Prometheus UI at http://prometheus.example.com/alerts

# View alert rules
kubectl get prometheusrule -n estatewise -o yaml

# Silence alert
# Use Alertmanager UI or CLI
```

### Custom Metrics Query

```bash
# Port forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Query examples:
# - Request rate: rate(http_requests_total{namespace="estatewise"}[5m])
# - Error rate: rate(http_request_errors_total{namespace="estatewise"}[5m])
# - P95 latency: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

---

## Troubleshooting Quick Reference

### Pod Stuck in Pending

```bash
kubectl describe pod <pod-name> -n estatewise | grep -A 10 Events
kubectl get nodes -o json | jq '.items[].status.allocatable'
```

### Pod CrashLoopBackOff

```bash
kubectl logs <pod-name> -n estatewise --previous
kubectl describe pod <pod-name> -n estatewise
```

### High Memory Usage

```bash
kubectl top pods -n estatewise --sort-by=memory
kubectl exec -it <pod-name> -n estatewise -- top -o %MEM
```

### Network Issues

```bash
# Test connectivity from pod
kubectl exec -it <pod-name> -n estatewise -- ping mongodb
kubectl exec -it <pod-name> -n estatewise -- curl -v http://estatewise-backend:3001/health

# Check network policies
kubectl get networkpolicy -n estatewise
kubectl describe networkpolicy <policy-name> -n estatewise
```

---

## Maintenance Windows

### Scheduled Maintenance Procedure

```bash
# 1. Notify users (30 min before)
# Send notification through communication channels

# 2. Enable maintenance mode (if supported)
kubectl set env deployment/estatewise-backend MAINTENANCE_MODE=true -n estatewise

# 3. Perform maintenance tasks
# - Apply updates
# - Run database migrations
# - Update configurations

# 4. Verify services
kubectl get pods -n estatewise
curl https://estatewise.example.com/health

# 5. Disable maintenance mode
kubectl set env deployment/estatewise-backend MAINTENANCE_MODE- -n estatewise

# 6. Monitor for issues
kubectl logs -f deployment/estatewise-backend -n estatewise
```

---

## Emergency Procedures

### Emergency Rollback

```bash
# Immediate rollback
kubectl rollout undo deployment/estatewise-backend -n estatewise

# Rollback to specific revision
kubectl rollout history deployment/estatewise-backend -n estatewise
kubectl rollout undo deployment/estatewise-backend --to-revision=N -n estatewise
```

### Emergency Scale Down

```bash
# Reduce load during incident
kubectl scale deployment/estatewise-backend --replicas=1 -n estatewise
kubectl scale deployment/estatewise-frontend --replicas=1 -n estatewise
```

### Circuit Breaker

```bash
# Disable specific features via ConfigMap
kubectl patch configmap estatewise-shared-config -n estatewise \
  -p '{"data":{"FEATURE_AI_ENABLED":"false"}}'

kubectl rollout restart deployment/estatewise-backend -n estatewise
```

---

## On-Call Cheat Sheet

```bash
# Quick status check
alias estate-status='kubectl get pods,hpa,pdb,svc -n estatewise'

# Quick logs
alias estate-logs='kubectl logs -f -l app=estatewise-backend -n estatewise --max-log-requests=10'

# Quick metrics
alias estate-metrics='kubectl top pods -n estatewise'

# Quick rollback
alias estate-rollback='kubectl rollout undo deployment/estatewise-backend -n estatewise'
```

---

**Contact Information:**
- Primary On-Call: [PagerDuty/Phone]
- Secondary On-Call: [PagerDuty/Phone]
- Engineering Manager: [Contact]
- Slack Channel: #estatewise-incidents
