# EstateWise Incident Response Runbook

## Table of Contents

- [Service Down](#service-down)
- [High Error Rate](#high-error-rate)
- [Performance Degradation](#performance-degradation)
- [Database Issues](#database-issues)
- [Memory Leaks](#memory-leaks)
- [Deployment Failures](#deployment-failures)
- [Security Incidents](#security-incidents)

---

## Service Down

### Symptoms
- Health check failures
- Prometheus alert: `ServiceDown`
- Users unable to access application

### Immediate Actions

```bash
# 1. Check pod status
kubectl get pods -n estatewise

# 2. Check recent events
kubectl get events -n estatewise --sort-by='.lastTimestamp'

# 3. Check pod logs
kubectl logs -l app=estatewise-backend --tail=100 -n estatewise

# 4. Describe failing pods
kubectl describe pod <pod-name> -n estatewise
```

### Common Causes & Solutions

#### Image Pull Errors
```bash
# Check image exists
docker manifest inspect ghcr.io/your-org/estatewise-app-backend:latest

# Update image pull secrets if needed
kubectl create secret docker-registry ghcr \
  --docker-server=ghcr.io \
  --docker-username=<username> \
  --docker-password=<token> \
  -n estatewise
```

#### Insufficient Resources
```bash
# Check node resources
kubectl top nodes

# Check pod resource usage
kubectl top pods -n estatewise

# Increase limits if needed
kubectl set resources deployment/estatewise-backend \
  --limits=cpu=1,memory=2Gi \
  -n estatewise
```

#### Failed Health Checks
```bash
# Port forward to test locally
kubectl port-forward svc/estatewise-backend 3001:3001 -n estatewise

# Test health endpoint
curl http://localhost:3001/health

# Adjust probe settings if needed
kubectl edit deployment estatewise-backend -n estatewise
```

### Escalation
If issue persists > 15 minutes:
1. Page on-call engineer
2. Consider rollback to last known good version
3. Enable debug logging

---

## High Error Rate

### Symptoms
- Prometheus alert: `HighErrorRate` or `CriticalErrorRate`
- Increased 5xx responses in logs
- User complaints about errors

### Investigation Steps

```bash
# 1. Check error rate by service
kubectl logs -l app=estatewise-backend -n estatewise | grep -i error | tail -50

# 2. Check for recent deployments
kubectl rollout history deployment/estatewise-backend -n estatewise

# 3. Query Prometheus for error metrics
# Access Prometheus UI and run:
# rate(http_request_errors_total{namespace="estatewise"}[5m])
```

### Common Causes & Solutions

#### Database Connection Issues
```bash
# Check MongoDB connectivity from pod
kubectl exec -it deployment/estatewise-backend -n estatewise -- \
  mongosh $MONGO_URI --eval "db.adminCommand('ping')"

# Check secrets
kubectl get secret estatewise-secrets -n estatewise -o yaml
```

#### External API Failures
```bash
# Test external APIs from pod
kubectl exec -it deployment/estatewise-backend -n estatewise -- \
  curl -v https://api.openai.com/v1/models

# Check network policies
kubectl get networkpolicy -n estatewise
```

#### Code Bugs in New Deployment
```bash
# Rollback to previous version
kubectl rollout undo deployment/estatewise-backend -n estatewise

# Monitor error rate
watch 'kubectl logs -l app=estatewise-backend -n estatewise --since=1m | grep -c ERROR'
```

### Escalation
If error rate > 5% for > 10 minutes:
1. Immediate rollback
2. Page engineering lead
3. Trigger incident bridge

---

## Performance Degradation

### Symptoms
- Prometheus alert: `HighResponseTime`
- Slow API responses
- User complaints about sluggishness

### Investigation Steps

```bash
# 1. Check CPU/Memory usage
kubectl top pods -n estatewise

# 2. Check HPA status
kubectl get hpa -n estatewise

# 3. Check for resource throttling
kubectl describe pod <pod-name> -n estatewise | grep -A 10 "State:"
```

### Common Causes & Solutions

#### Insufficient Replicas
```bash
# Manually scale up
kubectl scale deployment/estatewise-backend --replicas=5 -n estatewise

# Check if HPA is maxed out
kubectl get hpa estatewise-backend-hpa -n estatewise
```

#### Database Slow Queries
```bash
# Check MongoDB slow queries
# Connect to MongoDB and run:
db.setProfilingLevel(2)
db.system.profile.find().limit(10).sort({ts:-1}).pretty()

# Add indexes if needed
```

#### Memory Pressure
```bash
# Restart pods to clear memory
kubectl rollout restart deployment/estatewise-backend -n estatewise

# Increase memory limits
kubectl set resources deployment/estatewise-backend \
  --limits=memory=2Gi \
  -n estatewise
```

### Escalation
If p95 latency > 3s for > 15 minutes:
1. Scale up immediately
2. Review recent code changes
3. Consider enabling caching

---

## Database Issues

### Symptoms
- MongoDB connection errors
- Timeout errors
- Data inconsistencies

### Investigation Steps

```bash
# 1. Check MongoDB pod status
kubectl get pods -l app=mongodb -n estatewise

# 2. Test connection
kubectl exec -it deployment/estatewise-backend -n estatewise -- \
  mongosh $MONGO_URI --eval "db.runCommand({ping:1})"

# 3. Check MongoDB logs
kubectl logs -l app=mongodb -n estatewise --tail=100
```

### Common Causes & Solutions

#### Connection Pool Exhaustion
```javascript
// Increase connection pool size in backend config
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 50,
  minPoolSize: 10
});
```

#### Database Corruption
```bash
# Run repair (requires downtime)
kubectl exec -it mongodb-0 -n estatewise -- \
  mongod --repair

# Or restore from backup
kubectl apply -f kubernetes/jobs/mongodb-restore-job.yaml
```

### Escalation
If database is unavailable > 5 minutes:
1. Immediate escalation to database team
2. Consider failover to replica
3. Prepare for restore from backup

---

## Memory Leaks

### Symptoms
- Prometheus alert: `HighMemoryUsage`
- OOMKilled pods
- Gradually increasing memory usage

### Investigation Steps

```bash
# 1. Check memory trends
kubectl top pods -n estatewise --sort-by=memory

# 2. Check restart count
kubectl get pods -n estatewise

# 3. Get heap snapshot (Node.js)
kubectl exec -it <pod-name> -n estatewise -- \
  node --inspect-port=9229 --inspect-brk
```

### Solutions

```bash
# 1. Immediate: Restart affected pods
kubectl delete pod <pod-name> -n estatewise

# 2. Increase memory limits temporarily
kubectl set resources deployment/estatewise-backend \
  --limits=memory=3Gi \
  -n estatewise

# 3. Enable heap profiling
# Add to deployment:
# env:
#   - name: NODE_OPTIONS
#     value: "--max-old-space-size=2048"
```

### Post-Incident
1. Analyze heap dumps
2. Identify memory leaks in code
3. Fix and deploy patch

---

## Deployment Failures

### Symptoms
- Rollout stuck
- Pods failing to start
- Canary/Blue-Green deployment failed

### Investigation Steps

```bash
# 1. Check rollout status
kubectl rollout status deployment/estatewise-backend -n estatewise

# 2. Check rollout history
kubectl rollout history deployment/estatewise-backend -n estatewise

# 3. Describe deployment
kubectl describe deployment estatewise-backend -n estatewise
```

### Solutions

```bash
# Rollback to previous version
kubectl rollout undo deployment/estatewise-backend -n estatewise

# Rollback to specific revision
kubectl rollout undo deployment/estatewise-backend \
  --to-revision=5 \
  -n estatewise

# Pause rollout to investigate
kubectl rollout pause deployment/estatewise-backend -n estatewise

# Resume after fix
kubectl rollout resume deployment/estatewise-backend -n estatewise
```

---

## Security Incidents

### Symptoms
- Unusual API traffic patterns
- Security scan alerts
- Compromised credentials

### Immediate Actions

```bash
# 1. Isolate affected pods
kubectl label pod <pod-name> -n estatewise quarantine=true

# 2. Block suspicious IPs at ingress
kubectl annotate ingress estatewise-ingress \
  nginx.ingress.kubernetes.io/whitelist-source-range="10.0.0.0/8" \
  -n estatewise

# 3. Rotate secrets
kubectl create secret generic estatewise-secrets-new \
  --from-literal=jwtSecret="new-secret" \
  -n estatewise

# 4. Force pod restart to use new secrets
kubectl rollout restart deployment/estatewise-backend -n estatewise
```

### Escalation
**IMMEDIATE** escalation to security team

---

## General Tips

### Quick Commands

```bash
# Tail logs from all backend pods
kubectl logs -f -l app=estatewise-backend -n estatewise --max-log-requests=10

# Get resource usage
kubectl top pods -n estatewise

# Check ingress
kubectl describe ingress -n estatewise

# View all events
kubectl get events -n estatewise --sort-by='.lastTimestamp'
```

### Useful Aliases

```bash
alias k='kubectl'
alias kgp='kubectl get pods -n estatewise'
alias kgd='kubectl get deployments -n estatewise'
alias klf='kubectl logs -f -n estatewise'
alias kdp='kubectl describe pod -n estatewise'
```

---

**Remember**:
- Always check recent deployments first
- Use monitoring dashboards for trends
- Document all actions taken during incidents
- Conduct post-mortems for major incidents
