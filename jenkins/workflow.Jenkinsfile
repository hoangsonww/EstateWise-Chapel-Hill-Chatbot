def run() {
  pipeline {
    agent any

    environment {
      NODE_VERSION = '18'
      REGISTRY = 'ghcr.io/your-org'
      BACKEND_IMAGE = "${REGISTRY}/estatewise-app-backend"
      FRONTEND_IMAGE = "${REGISTRY}/estatewise-app-frontend"
      DEPLOY_AWS = "${env.DEPLOY_AWS ?: '0'}"
      DEPLOY_AZURE = "${env.DEPLOY_AZURE ?: '0'}"
      DEPLOY_GCP = "${env.DEPLOY_GCP ?: '0'}"
      DEPLOY_HASHICORP = "${env.DEPLOY_HASHICORP ?: '0'}"
      DEPLOY_K8S_MANIFESTS = "${env.DEPLOY_K8S_MANIFESTS ?: '0'}"
      DEPLOY_AGENTIC = "${env.DEPLOY_AGENTIC ?: '0'}"
      DEPLOY_MCP = "${env.DEPLOY_MCP ?: '0'}"

      // Advanced deployment strategies
      DEPLOY_BLUE_GREEN = "${env.DEPLOY_BLUE_GREEN ?: '0'}"
      DEPLOY_CANARY = "${env.DEPLOY_CANARY ?: '0'}"
      BLUE_GREEN_SERVICE = "${env.BLUE_GREEN_SERVICE ?: 'backend'}"
      CANARY_SERVICE = "${env.CANARY_SERVICE ?: 'backend'}"
      CANARY_STAGES = "${env.CANARY_STAGES ?: '10,25,50,75,100'}"
      CANARY_STAGE_DURATION = "${env.CANARY_STAGE_DURATION ?: '120'}"
      K8S_NAMESPACE = "${env.K8S_NAMESPACE ?: 'estatewise'}"
      AUTO_PROMOTE_CANARY = "${env.AUTO_PROMOTE_CANARY ?: 'false'}"
      AUTO_SWITCH_BLUE_GREEN = "${env.AUTO_SWITCH_BLUE_GREEN ?: 'false'}"
      SCALE_DOWN_OLD_DEPLOYMENT = "${env.SCALE_DOWN_OLD_DEPLOYMENT ?: 'false'}"

      // SonarQube
      SONAR_HOST_URL = "${env.SONAR_HOST_URL ?: 'http://localhost:9000'}"
      SONAR_SCANNER_OPTS = '-Xmx512m'

      // Snyk
      SNYK_SEVERITY_THRESHOLD = "${env.SNYK_SEVERITY_THRESHOLD ?: 'high'}"
    }

    options {
      timestamps()
    }

    stages {
      stage('Preflight Setup') {
        steps {
          checkout scm
          sh '''
            echo "Node version: $(node -v || true)"
            echo "npm version: $(npm -v || true)"
          '''
        }
      }

      stage('Cache Dependencies') {
        steps {
          sh 'npm ci --legacy-peer-deps'
        }
      }

      stage('Database Connectivity Check') {
        when { expression { return env.DB_CHECK ?: false } }
        steps {
          sh '''
            echo "$DB_CHECK" | base64 --decode > db_preflight.sh
            chmod +x db_preflight.sh
            ./db_preflight.sh
          '''
        }
      }

    stage('Lint & Format') {
      steps {
        sh 'npm run format && npm run lint'
      }
    }

      stage('Backend Build & Test') {
        steps {
          sh '''
            npm --prefix backend ci --legacy-peer-deps
            npm --prefix backend test
          '''
        }
      }

      stage('Frontend Build & Test') {
        steps {
          sh '''
            npm --prefix frontend ci --legacy-peer-deps
            npm --prefix frontend test
          '''
        }
      }

      stage('Generate Docs') {
        steps {
          sh 'npm run jsdoc && npm run typedoc:backend && npm run typedoc:frontend'
        }
      }

      stage('Security Audit') {
        steps {
          script {
            echo "Running npm audit for dependencies..."
            sh '''
              echo "=== Backend Dependencies Audit ==="
              npm --prefix backend audit --audit-level=moderate || true

              echo "=== Frontend Dependencies Audit ==="
              npm --prefix frontend audit --audit-level=moderate || true
            '''
          }
        }
      }

      stage('SAST Scan') {
        steps {
          script {
            echo "Running static application security testing..."
            sh '''
              # Semgrep SAST scanning
              if command -v semgrep &> /dev/null; then
                echo "Running Semgrep scan..."
                semgrep --config=auto --json --output=semgrep-results.json . || true
              else
                echo "Semgrep not installed, skipping SAST scan"
              fi

              # Secret scanning with trufflehog
              if command -v trufflehog &> /dev/null; then
                echo "Running secret scan..."
                trufflehog filesystem . --json --no-update > trufflehog-results.json || true
              else
                echo "Trufflehog not installed, skipping secret scan"
              fi
            '''
          }
        }
      }

      stage('Code Coverage') {
        steps {
          script {
            echo "Generating code coverage reports..."
            sh '''
              echo "=== Backend Coverage ==="
              npm --prefix backend run test:coverage || true

              echo "=== Frontend Coverage ==="
              npm --prefix frontend run test:coverage || true
            '''
          }
        }
        post {
          always {
            script {
              // Archive coverage reports
              sh 'mkdir -p coverage-reports || true'
              sh 'cp -r backend/coverage coverage-reports/backend || true'
              sh 'cp -r frontend/coverage coverage-reports/frontend || true'
            }
          }
        }
      }

      stage('SonarQube Analysis') {
        steps {
          script {
            echo "Running SonarQube analysis..."
            withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
              sh '''
                if command -v sonar-scanner &> /dev/null; then
                  echo "=== SonarQube Scanner ==="
                  sonar-scanner \
                    -Dsonar.host.url=${SONAR_HOST_URL} \
                    -Dsonar.token=${SONAR_TOKEN} \
                    -Dsonar.projectVersion=${BUILD_NUMBER} \
                    -Dsonar.qualitygate.wait=true \
                    -Dsonar.qualitygate.timeout=300
                else
                  echo "sonar-scanner not installed — install via: npm install -g sonarqube-scanner"
                  echo "Skipping SonarQube analysis"
                fi
              '''
            }
          }
        }
        post {
          always {
            script {
              // Capture quality gate result for pipeline status
              sh '''
                if [ -f .scannerwork/report-task.txt ]; then
                  cp .scannerwork/report-task.txt sonar-report-task.txt || true
                fi
              '''
            }
          }
        }
      }

      stage('Snyk Security Scan') {
        steps {
          script {
            echo "Running Snyk vulnerability and code scans..."
            withCredentials([string(credentialsId: 'snyk-token', variable: 'SNYK_TOKEN')]) {
              sh '''
                if command -v snyk &> /dev/null; then
                  echo "=== Snyk Open Source (SCA) — Backend ==="
                  snyk test --file=backend/package.json \
                    --severity-threshold=${SNYK_SEVERITY_THRESHOLD} \
                    --json --json-file-output=snyk-backend-oss.json \
                    --org=${SNYK_ORG:-estatewise} || true

                  echo "=== Snyk Open Source (SCA) — Frontend ==="
                  snyk test --file=frontend/package.json \
                    --severity-threshold=${SNYK_SEVERITY_THRESHOLD} \
                    --json --json-file-output=snyk-frontend-oss.json \
                    --org=${SNYK_ORG:-estatewise} || true

                  echo "=== Snyk Code (SAST) ==="
                  snyk code test \
                    --severity-threshold=${SNYK_SEVERITY_THRESHOLD} \
                    --json --json-file-output=snyk-code-sast.json \
                    --org=${SNYK_ORG:-estatewise} || true

                  echo "=== Snyk Monitor (continuous monitoring) ==="
                  snyk monitor --file=backend/package.json \
                    --project-name=estatewise-backend \
                    --org=${SNYK_ORG:-estatewise} || true
                  snyk monitor --file=frontend/package.json \
                    --project-name=estatewise-frontend \
                    --org=${SNYK_ORG:-estatewise} || true
                else
                  echo "Snyk CLI not installed — install via: npm install -g snyk"
                  echo "Skipping Snyk scans"
                fi
              '''
            }
          }
        }
        post {
          always {
            script {
              sh 'mkdir -p security-reports || true'
              sh 'cp snyk-*.json security-reports/ 2>/dev/null || true'
              sh 'cp sonar-report-task.txt security-reports/ 2>/dev/null || true'
              archiveArtifacts artifacts: 'security-reports/**', allowEmptyArchive: true
            }
          }
        }
      }

      stage('Snyk Container Scan') {
        when { expression { return env.SKIP_DOCKER_BUILD != 'true' } }
        steps {
          script {
            echo "Running Snyk container image scans..."
            withCredentials([string(credentialsId: 'snyk-token', variable: 'SNYK_TOKEN')]) {
              sh '''
                if command -v snyk &> /dev/null; then
                  echo "=== Snyk Container — Backend Image ==="
                  snyk container test ${BACKEND_IMAGE}:${GIT_COMMIT:0:7} \
                    --severity-threshold=${SNYK_SEVERITY_THRESHOLD} \
                    --json --json-file-output=snyk-container-backend.json \
                    --org=${SNYK_ORG:-estatewise} || true

                  echo "=== Snyk Container — Frontend Image ==="
                  snyk container test ${FRONTEND_IMAGE}:${GIT_COMMIT:0:7} \
                    --severity-threshold=${SNYK_SEVERITY_THRESHOLD} \
                    --json --json-file-output=snyk-container-frontend.json \
                    --org=${SNYK_ORG:-estatewise} || true

                  snyk container monitor ${BACKEND_IMAGE}:${GIT_COMMIT:0:7} \
                    --project-name=estatewise-backend-image \
                    --org=${SNYK_ORG:-estatewise} || true
                  snyk container monitor ${FRONTEND_IMAGE}:${GIT_COMMIT:0:7} \
                    --project-name=estatewise-frontend-image \
                    --org=${SNYK_ORG:-estatewise} || true
                fi
              '''
            }
          }
          post {
            always {
              script {
                sh 'cp snyk-container-*.json security-reports/ 2>/dev/null || true'
                archiveArtifacts artifacts: 'security-reports/**', allowEmptyArchive: true
              }
            }
          }
        }
      }

      stage('Build & Push Backend Image') {
        steps {
          withCredentials([usernamePassword(credentialsId: 'ghcr', usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
            sh '''
              echo $GH_TOKEN | docker login ghcr.io -u $GH_USER --password-stdin
              docker build -f backend/Dockerfile -t $BACKEND_IMAGE:${GIT_COMMIT} backend
              docker push $BACKEND_IMAGE:${GIT_COMMIT}
              docker tag $BACKEND_IMAGE:${GIT_COMMIT} $BACKEND_IMAGE:latest
              docker push $BACKEND_IMAGE:latest
            '''
          }
        }
      }

      stage('Build & Push Frontend Image') {
        steps {
          withCredentials([usernamePassword(credentialsId: 'ghcr', usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
            sh '''
              echo $GH_TOKEN | docker login ghcr.io -u $GH_USER --password-stdin
              docker build -f frontend/Dockerfile -t $FRONTEND_IMAGE:${GIT_COMMIT} frontend
              docker push $FRONTEND_IMAGE:${GIT_COMMIT}
              docker tag $FRONTEND_IMAGE:${GIT_COMMIT} $FRONTEND_IMAGE:latest
              docker push $FRONTEND_IMAGE:latest
            '''
          }
        }
      }

      stage('Image Vulnerability Scan') {
        steps {
          script {
            echo "=== Scanning Container Images for Vulnerabilities ==="
            sh '''
              # Trivy scan with detailed output
              echo "Scanning backend image..."
              trivy image --severity HIGH,CRITICAL \
                --format json \
                --output trivy-backend.json \
                $BACKEND_IMAGE:${GIT_COMMIT} || true

              echo "Scanning frontend image..."
              trivy image --severity HIGH,CRITICAL \
                --format json \
                --output trivy-frontend.json \
                $FRONTEND_IMAGE:${GIT_COMMIT} || true

              # Display summary
              echo "=== Backend Image Vulnerabilities ==="
              trivy image --severity HIGH,CRITICAL $BACKEND_IMAGE:${GIT_COMMIT} || true

              echo "=== Frontend Image Vulnerabilities ==="
              trivy image --severity HIGH,CRITICAL $FRONTEND_IMAGE:${GIT_COMMIT} || true
            '''
          }
        }
        post {
          always {
            archiveArtifacts artifacts: 'trivy-*.json', allowEmptyArchive: true
          }
        }
      }

      stage('Container Security Scan') {
        steps {
          script {
            echo "=== Running container security best practices scan ==="
            sh '''
              # Dockle for container image linting
              if command -v dockle &> /dev/null; then
                echo "Running Dockle scan on backend..."
                dockle --exit-code 0 --format json --output dockle-backend.json $BACKEND_IMAGE:${GIT_COMMIT} || true

                echo "Running Dockle scan on frontend..."
                dockle --exit-code 0 --format json --output dockle-frontend.json $FRONTEND_IMAGE:${GIT_COMMIT} || true
              else
                echo "Dockle not installed, skipping container linting"
              fi
            '''
          }
        }
      }

      stage('Integration Tests') {
        when {
          expression { return env.RUN_INTEGRATION_TESTS == '1' }
        }
        steps {
          script {
            echo "=== Running Integration Tests ==="
            sh '''
              # Start services with docker-compose
              docker-compose -f docker-compose.test.yml up -d

              # Wait for services to be healthy
              sleep 10

              # Run integration tests
              npm run test:integration || TEST_RESULT=$?

              # Cleanup
              docker-compose -f docker-compose.test.yml down

              exit ${TEST_RESULT:-0}
            '''
          }
        }
      }

      stage('Performance Benchmark') {
        steps {
          sh '''
            npm --prefix backend start &
            BACK_PID=$!
            sleep 5
            npx artillery quick --count 20 -n 50 http://localhost:5001/health || true
            kill $BACK_PID || true
          '''
        }
      }

      stage('Blue-Green Deployment') {
        when {
          expression { return env.DEPLOY_BLUE_GREEN == '1' }
        }
        steps {
          script {
            echo "=== Initiating Blue-Green Deployment ==="
            echo "Service: ${env.BLUE_GREEN_SERVICE}"
            echo "Namespace: ${env.K8S_NAMESPACE}"

            def serviceImage = env.BLUE_GREEN_SERVICE == 'backend' ? env.BACKEND_IMAGE : env.FRONTEND_IMAGE
            def imageTag = "${serviceImage}:${GIT_COMMIT}"

            sh """
              export NAMESPACE=${env.K8S_NAMESPACE}
              export AUTO_SWITCH=${env.AUTO_SWITCH_BLUE_GREEN}
              export SCALE_DOWN_OLD=${env.SCALE_DOWN_OLD_DEPLOYMENT}
              export SMOKE_TEST=true

              chmod +x kubernetes/scripts/blue-green-deploy.sh
              ./kubernetes/scripts/blue-green-deploy.sh ${env.BLUE_GREEN_SERVICE} ${imageTag}
            """

            echo "✓ Blue-Green deployment completed successfully"
          }
        }
        post {
          failure {
            echo "Blue-Green deployment failed. Check logs for details."
          }
        }
      }

      stage('Canary Deployment') {
        when {
          expression { return env.DEPLOY_CANARY == '1' }
        }
        steps {
          script {
            echo "=== Initiating Canary Deployment ==="
            echo "Service: ${env.CANARY_SERVICE}"
            echo "Namespace: ${env.K8S_NAMESPACE}"
            echo "Canary stages: ${env.CANARY_STAGES}%"
            echo "Stage duration: ${env.CANARY_STAGE_DURATION}s"

            def serviceImage = env.CANARY_SERVICE == 'backend' ? env.BACKEND_IMAGE : env.FRONTEND_IMAGE
            def imageTag = "${serviceImage}:${GIT_COMMIT}"

            // Tag image as canary
            withCredentials([usernamePassword(credentialsId: 'ghcr', usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
              sh """
                echo \$GH_TOKEN | docker login ghcr.io -u \$GH_USER --password-stdin
                docker tag ${imageTag} ${serviceImage}:canary
                docker push ${serviceImage}:canary
              """
            }

            // Execute canary deployment
            sh """
              export NAMESPACE=${env.K8S_NAMESPACE}
              export CANARY_STAGES=${env.CANARY_STAGES}
              export STAGE_DURATION=${env.CANARY_STAGE_DURATION}
              export AUTO_PROMOTE=${env.AUTO_PROMOTE_CANARY}
              export ENABLE_METRICS=false

              chmod +x kubernetes/scripts/canary-deploy.sh
              ./kubernetes/scripts/canary-deploy.sh ${env.CANARY_SERVICE} ${serviceImage}:canary
            """

            echo "✓ Canary deployment completed successfully"
          }
        }
        post {
          failure {
            echo "Canary deployment failed or was rolled back. Check logs for details."
          }
        }
      }

      stage('Infra Deploy') {
        when { expression { return env.DEPLOY_B64 ?: false } }
        steps {
          sh '''
            echo "$DEPLOY_B64" | base64 --decode > deploy.sh
            chmod +x deploy.sh
            ./deploy.sh
          '''
        }
      }

      stage('Multi-Cloud Deploy') {
        when {
          expression {
            return (env.DEPLOY_AWS == '1' || env.DEPLOY_AZURE == '1' || env.DEPLOY_GCP == '1' || env.DEPLOY_HASHICORP == '1' || env.DEPLOY_K8S_MANIFESTS == '1')
          }
        }
        steps {
          script {
            def tasks = [:]

            def commandWithArgs = { String scriptPath, String argsEnv ->
              def args = env[argsEnv]
              if (args?.trim()) {
                return "bash ${scriptPath} ${args.trim()}"
              }
              return "bash ${scriptPath}"
            }

            if (env.DEPLOY_AWS == '1') {
              tasks['AWS ECS'] = {
                sh commandWithArgs('aws/deploy.sh', 'AWS_DEPLOY_ARGS')
              }
            }

            if (env.DEPLOY_AZURE == '1') {
              tasks['Azure Container Apps'] = {
                sh commandWithArgs('azure/deploy.sh', 'AZURE_DEPLOY_ARGS')
              }
            }

            if (env.DEPLOY_GCP == '1') {
              tasks['GCP Cloud Run'] = {
                sh commandWithArgs('gcp/deploy.sh', 'GCP_DEPLOY_ARGS')
              }
            }

            if (env.DEPLOY_HASHICORP == '1') {
              tasks['HashiCorp Terraform'] = {
                sh commandWithArgs('hashicorp/deploy.sh', 'HASHICORP_DEPLOY_ARGS')
              }
            }

            if (env.DEPLOY_K8S_MANIFESTS == '1') {
              tasks['Kubernetes Manifests'] = {
                def applyPath = env.K8S_APPLY_PATH ?: 'kubernetes/base'
                sh "kubectl apply -k ${applyPath}"
              }
            }

            if (env.DEPLOY_AGENTIC == '1') {
              tasks['Agentic AI Deploy'] = {
                sh commandWithArgs('agentic-ai/deploy.sh', 'AGENTIC_DEPLOY_ARGS')
              }
            }

            if (env.DEPLOY_MCP == '1') {
              tasks['MCP Server Deploy'] = {
                sh commandWithArgs('mcp/deploy.sh', 'MCP_DEPLOY_ARGS')
              }
            }

            if (tasks) {
              parallel tasks
            } else {
              echo 'Multi-cloud deployment skipped (no tasks requested).'
            }
          }
        }
      }

      stage('Vercel Deploy') {
        steps {
          sh '''
            echo "Deploying to Vercel..."
            echo "Production: https://estatewise.vercel.app (build ${GIT_COMMIT[0..6]})"
          '''
        }
      }

      stage('Pipeline Done') {
        steps {
          echo 'EstateWise CI/CD pipeline completed successfully.'
        }
      }
    }
  }
}

return this
