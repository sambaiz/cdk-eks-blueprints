import assert = require("assert");
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { Cluster } from "aws-cdk-lib/aws-eks";
import { CfnServiceLinkedRole, IRole, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { supportsALL } from "../../utils";

@supportsALL
export class EmrEksAddOn implements ClusterAddOn {
  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    assert(clusterInfo.cluster instanceof Cluster, "EmrEksAddOn cannot be used with imported clusters as it requires changes to the cluster authentication.");
    const cluster: Cluster = clusterInfo.cluster;

    /*
    * Create the service role used by EMR on EKS if one doesn't exist
    */
    const roleNameforEmrContainers = 'AWSServiceRoleForAmazonEMRContainers';
    let emrEksServiceRole: IRole = Role.fromRoleName(cluster.stack, 'ServiceRoleForAmazonEMRContainers', roleNameforEmrContainers);
    if (emrEksServiceRole.roleName != roleNameforEmrContainers) {
      new CfnServiceLinkedRole(cluster.stack, 'EmrServiceRole', {
        awsServiceName: 'emr-containers.amazonaws.com',
      });

      //Init the service role as IRole because `addRoleMapping` method does not
      //support the CfnServiceLinkedRole type
      emrEksServiceRole = Role.fromRoleName(cluster.stack, 'ServiceRoleForAmazonEMRContainersCreated', roleNameforEmrContainers);
    }

    //Add the service role to the AwsAuth
    cluster.awsAuth.addRoleMapping(
      emrEksServiceRole,
      {
        username: 'emr-containers',
        groups: ['']
      }
    );
  
    return Promise.resolve(emrEksServiceRole);
  }
}