# Classic infrastructure stack

## Scenario

This project will deploy a classic infra composed of:

* A VPC with public and private parts, and the corresponding NAT-gw
* An Application Load Balancer
* An Autoscaling Group with CPU-based elasticity
* A Postgresql instance

## Running the demo

* Install `node`

```bash
curl -L https://git.io/n-install | bash
. $HOME/.bashrc 

node --version
npm --version
```

* Compile and check the stack

```bash
npm run build
npm run cdk synth
```

* Init the cdk assets

```bash
npm run cdk bootstrap
```

* Deploy the stack

```bash
npm run cdk deploy
```

## Clean up

* Just delete de stack

```bash
npm run cdk destroy
```