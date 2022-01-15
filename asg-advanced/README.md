# Advanced CDK usage

## Scenario

This is a very similar project to the last one, but shows how to achieve
a more sophisticated design by dividing the application in different stacks,
one for each layer (networking, database, computing).

The project deploys:

* A VPC with public and private parts, and the corresponding NAT-gw
* A Mysql instance
* Explicit security groups, with centralized configuration at network level
* An Application Load Balancer
* An Autoscaling Group with CPU-based elasticity

## Todo

The database credentials are stored in plaintext instead of being obtained from
an already-existing secret. That's practical for a demo, but not acceptable for
production.

Also, those credentials are inserted in the source code of the application (in particular,
in `pom.xml` file) using the user-data.

A future version will handle this situation in a more elegant way. Also, it would be
advisable to directly deploy the artifact instead of requiring its compilation... but
that would force us to stop using the [official Spring repository](https://github.com/spring-petclinic/spring-framework-petclinic).

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
npx cdk synth
```

* Init the cdk assets

```bash
npx cdk bootstrap
```

* Deploy the stack

```bash
npx cdk deploy --all --require-approval never
```

The output of the last stack will contain the http address of the load balancer.

## Check security

* Install [cfn-nag](https://github.com/stelligent/cfn_nag)

```
sudo apt update
sudo apt install ruby -y
sudo gem install cfn-nag
```

* Ensure the synths are generated

```
npm run synth
```

* Run the checks

```
cfn_nag_scan -g --input-path cdk.out/
```

## Clean up

* Just delete de stack

```bash
npx cdk destroy -all
```