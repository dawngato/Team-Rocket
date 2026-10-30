# Kubernetes Infrastructure Configurations

This directory contains the Helm chart for deploying HimVote in production Kubernetes environments.

## Directory Structure
* Chart.yaml: Helm chart metadata
* values.yaml: Base values definition
* values_dev.yaml: Development environment overrides
* values_prod.yaml: Production environment configuration
* templates/namespaces.yaml: Enforces restricted Pod Security Standards on all namespaces
* templates/networkpolicies/: Zero trust network policies denying cross domain connectivity
* templates/deployments/: Workload deployments with non root and read only filesystems
* templates/services/: ClusterIP service definitions
* templates/ingress.yaml: Ingress routing for dual public origins
* templates/hpa.yaml: Horizontal pod autoscaling definitions

## Pod Security Standards
All workloads adhere to the Kubernetes restricted profile:
* Non root execution
* Read only root filesystem
* Linux capabilities dropped
* RuntimeDefault seccomp profile applied
