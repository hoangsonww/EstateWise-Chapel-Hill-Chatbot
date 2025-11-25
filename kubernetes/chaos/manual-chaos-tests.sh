#!/bin/bash
# Manual Chaos Engineering Tests for EstateWise
# Use when Chaos Mesh is not available

set -euo pipefail

NAMESPACE="${NAMESPACE:-estatewise}"
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${COLOR_BLUE}=== EstateWise Chaos Engineering Tests ===${NC}"
echo ""

# Test 1: Pod Deletion Test
test_pod_deletion() {
  echo -e "${COLOR_YELLOW}Test 1: Pod Deletion (Simulating pod crashes)${NC}"
  echo "This test deletes a random backend pod and verifies recovery"

  POD=$(kubectl get pods -n $NAMESPACE -l app=estatewise-backend -o jsonpath='{.items[0].metadata.name}')

  echo "Deleting pod: $POD"
  kubectl delete pod $POD -n $NAMESPACE

  echo "Waiting for replacement pod..."
  sleep 5
  kubectl wait --for=condition=ready pod -l app=estatewise-backend -n $NAMESPACE --timeout=60s

  echo -e "${COLOR_GREEN}✓ Pod deletion test passed${NC}"
  echo ""
}

# Test 2: Resource Stress Test
test_resource_stress() {
  echo -e "${COLOR_YELLOW}Test 2: Resource Stress Test${NC}"
  echo "This test applies CPU/Memory stress to verify autoscaling"

  POD=$(kubectl get pods -n $NAMESPACE -l app=estatewise-backend -o jsonpath='{.items[0].metadata.name}')

  echo "Applying CPU stress to pod: $POD"
  kubectl exec $POD -n $NAMESPACE -- sh -c "yes > /dev/null &" || true

  echo "Monitoring HPA response..."
  sleep 30
  kubectl get hpa -n $NAMESPACE

  echo "Stopping stress test..."
  kubectl exec $POD -n $NAMESPACE -- pkill yes || true

  echo -e "${COLOR_GREEN}✓ Resource stress test completed${NC}"
  echo ""
}

# Test 3: Database Connection Failure
test_database_failure() {
  echo -e "${COLOR_YELLOW}Test 3: Database Connection Failure${NC}"
  echo "This test simulates database unavailability"

  echo "Scaling MongoDB to 0..."
  ORIGINAL_REPLICAS=$(kubectl get deployment mongodb -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
  kubectl scale deployment/mongodb --replicas=0 -n $NAMESPACE 2>/dev/null || echo "MongoDB deployment not found, skipping"

  echo "Checking application behavior..."
  sleep 10
  kubectl logs -l app=estatewise-backend -n $NAMESPACE --tail=20 | grep -i "error\|connection" || true

  echo "Restoring MongoDB..."
  kubectl scale deployment/mongodb --replicas=$ORIGINAL_REPLICAS -n $NAMESPACE 2>/dev/null || true

  echo -e "${COLOR_GREEN}✓ Database failure test completed${NC}"
  echo ""
}

# Test 4: Network Partition Simulation
test_network_partition() {
  echo -e "${COLOR_YELLOW}Test 4: Network Partition Simulation${NC}"
  echo "This test simulates network connectivity issues"

  POD=$(kubectl get pods -n $NAMESPACE -l app=estatewise-backend -o jsonpath='{.items[0].metadata.name}')

  echo "Adding network delay to pod: $POD"
  kubectl exec $POD -n $NAMESPACE -- tc qdisc add dev eth0 root netem delay 500ms 2>/dev/null || \
    echo "tc command not available in container, skipping network test"

  echo "Testing API response time..."
  kubectl port-forward -n $NAMESPACE $POD 8888:3001 &
  PF_PID=$!
  sleep 3

  time curl -s http://localhost:8888/health > /dev/null || true

  kill $PF_PID 2>/dev/null || true

  echo "Removing network delay..."
  kubectl exec $POD -n $NAMESPACE -- tc qdisc del dev eth0 root 2>/dev/null || true

  echo -e "${COLOR_GREEN}✓ Network partition test completed${NC}"
  echo ""
}

# Test 5: Rolling Restart Test
test_rolling_restart() {
  echo -e "${COLOR_YELLOW}Test 5: Rolling Restart Test${NC}"
  echo "This test performs a rolling restart and monitors availability"

  echo "Triggering rolling restart..."
  kubectl rollout restart deployment/estatewise-backend -n $NAMESPACE

  echo "Monitoring rollout..."
  kubectl rollout status deployment/estatewise-backend -n $NAMESPACE --timeout=5m

  echo "Verifying all pods are ready..."
  kubectl get pods -l app=estatewise-backend -n $NAMESPACE

  echo -e "${COLOR_GREEN}✓ Rolling restart test passed${NC}"
  echo ""
}

# Test 6: High Traffic Simulation
test_high_traffic() {
  echo -e "${COLOR_YELLOW}Test 6: High Traffic Simulation${NC}"
  echo "This test simulates high load to verify autoscaling"

  SVC_IP=$(kubectl get svc estatewise-backend -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')

  echo "Creating load generator pod..."
  kubectl run load-generator --image=busybox:1.36 -n $NAMESPACE --rm -it --restart=Never -- \
    sh -c "while true; do wget -q -O- http://$SVC_IP:3001/health; done" &
  LOAD_PID=$!

  echo "Monitoring HPA for 60 seconds..."
  for i in {1..6}; do
    sleep 10
    echo "HPA status at ${i}0s:"
    kubectl get hpa -n $NAMESPACE
  done

  echo "Stopping load generator..."
  kubectl delete pod load-generator -n $NAMESPACE 2>/dev/null || true
  kill $LOAD_PID 2>/dev/null || true

  echo -e "${COLOR_GREEN}✓ High traffic test completed${NC}"
  echo ""
}

# Main menu
show_menu() {
  echo "Select chaos test to run:"
  echo "1) Pod Deletion Test"
  echo "2) Resource Stress Test"
  echo "3) Database Failure Test"
  echo "4) Network Partition Test"
  echo "5) Rolling Restart Test"
  echo "6) High Traffic Test"
  echo "7) Run All Tests"
  echo "0) Exit"
  echo ""
}

run_all_tests() {
  test_pod_deletion
  test_resource_stress
  test_database_failure
  test_network_partition
  test_rolling_restart
  test_high_traffic

  echo -e "${COLOR_GREEN}=== All Chaos Tests Completed ===${NC}"
}

# Main loop
while true; do
  show_menu
  read -p "Enter choice: " choice

  case $choice in
    1) test_pod_deletion ;;
    2) test_resource_stress ;;
    3) test_database_failure ;;
    4) test_network_partition ;;
    5) test_rolling_restart ;;
    6) test_high_traffic ;;
    7) run_all_tests ;;
    0) echo "Exiting..."; exit 0 ;;
    *) echo -e "${COLOR_RED}Invalid choice${NC}" ;;
  esac
done
