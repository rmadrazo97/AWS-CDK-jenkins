import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';

export class MyCdkAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC');

    const userdata = ec2.UserData.forLinux();
    userdata.addCommands(
      "yum update -y",
      "yum install -y docker",
      "service docker start",
      "docker run -d -p 8080:8080 -p 50000:50000 jenkins/jenkins"
    );

    const instance = new ec2.Instance(this, 'Instance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage(),
      keyName: "techub-master",  // replace this with your key pair name
      userData: userdata
    });

    const jenkinsPort = new ec2.Port({
      protocol: ec2.Protocol.TCP,
      fromPort: 8080,
      toPort: 8080,
      stringRepresentation: 'Allow Jenkins'
    });

    instance.connections.allowFromAnyIpv4(jenkinsPort, 'Allow Jenkins Port');
  }
}

