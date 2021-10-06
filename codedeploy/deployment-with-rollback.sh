APP_NAME=simplestweb
BUCKET_NAME=simplestwebcodedeploystack-assetsb7c36b1b-n9254yr2yykr

DEPLOYMENT_ID=$(aws deploy create-deployment \
    --application-name $APP_NAME \
    --deployment-config-name CodeDeployDefault.AllAtOnce \
    --ignore-application-stop-failures \
    --deployment-group-name dev \
    --file-exists-behavior OVERWRITE \
    --description "The simplest web app ever seen." \
    --s3-location bucket=$BUCKET_NAME,bundleType=zip,key=simplest-web-app-v1.zip \
    --query deploymentId \
    --output text)

echo Deployment id: $DEPLOYMENT_ID

DEPLOYMENT_STATUS=$(aws deploy get-deployment --deployment-id $DEPLOYMENT_ID --query deploymentInfo.status --output text)
echo Deployment status: $DEPLOYMENT_STATUS

GREEN_ASG_ID="None"
while [[ "$GREEN_ASG_ID" == "None" ]]
do
    GREEN_ASG_ID=$(aws deploy get-deployment \
    --deployment-id $DEPLOYMENT_ID \
    --query deploymentInfo.targetInstances.autoScalingGroups[0] \
    --output text)
done
echo "Green ASG id: $GREEN_ASG_ID"

read -p "Press any key to execute a rollback... " -n1 -s

unset ROLLBACK_STATUS
while [[ "$ROLLBACK_STATUS" != "Succeeded" ]]
do
    ROLLBACK_STATUS=$(aws deploy stop-deployment --deployment-id "$DEPLOYMENT_ID" --query "status" --output text)
    echo "Executing rollback ($ROLLBACK_STATUS)."
    sleep 3
done

echo "Removing instances from the green ASG."
aws autoscaling set-desired-capacity --auto-scaling-group-name $GREEN_ASG_ID --desired-capacity 0

unset GREEN_ASG_INSTANCES
while [[ "$GREEN_ASG_INSTANCES" != "0" ]]
do
    GREEN_ASG_INSTANCES=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-name $GREEN_ASG_ID  --query AutoScalingGroups[0].Instances --output text | wc -l)
    echo "Instances in the green ASG: $GREEN_ASG_INSTANCES"
    sleep 5
done

echo "Deleting green ASG ($GREEN_ASG_ID)."
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name $GREEN_ASG_ID
