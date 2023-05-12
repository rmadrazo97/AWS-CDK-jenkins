import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';

export class MyCdkAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC');

    const userdata = ec2.UserData.forLinux();
    userdata.addCommands(
      "sudo yum update -y",
      "sudo yum install docker -y",
      "sudo service docker start",
      "sudo systemctl enable docker.service",
      "usermod -a -G docker ec2-user",
      "docker run -d -p 8080:8080 -p 50000:50000 jenkins/jenkins"
    );

    const instance = new ec2.Instance(this, 'Instance', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // Ensure public IP is assigned
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

    const sshPort = new ec2.Port({
      protocol: ec2.Protocol.TCP,
      fromPort: 22,
      toPort: 22,
      stringRepresentation: 'Allow SSH'
    });

    instance.connections.allowFromAnyIpv4(jenkinsPort, 'Allow Jenkins Port');
    instance.connections.allowFromAnyIpv4(sshPort, 'Allow SSH');
  }
}

