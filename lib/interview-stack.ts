import * as appsync from '@aws-cdk/aws-appsync'
import * as rds from '@aws-cdk/aws-rds';
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as path from "path";

export class InterviewStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const secret = new rds.DatabaseSecret(this, 'AuroraSecret', {
            username: 'clusteradmin',
        });

        const vpc = new ec2.Vpc(this, 'AuroraVpc');

        const cluster = new rds.ServerlessCluster(this, 'AuroraCluster', {
            engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
            vpc,
            credentials: {username: 'admin'},
            clusterIdentifier: 'db-endpoint',
            defaultDatabaseName: 'interview',
        });

        const post = new appsync.GraphqlApi(this, 'blog', {
            name: 'blog',
            schema: appsync.Schema.fromAsset(path.resolve(__dirname, '../schemas/blog.graphql')),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: appsync.AuthorizationType.IAM,
                },
            },
            xrayEnabled: true,
        });


        const rdsDS = post.addRdsDataSource('rds', cluster, secret, 'blog');

        // Set up a resolver for query
        rdsDS.createResolver({
            typeName: 'Query',
            fieldName: 'posts',
            requestMappingTemplate: appsync.MappingTemplate.fromString(`
            {
              "version": "2018-05-29",
              "statements": [
                "SELECT * FROM posts limit $ctx.args.perPage offset (($ctx.args.page-1) * $ctx.args.perPage) "
              ]
            }
            `),
            responseMappingTemplate: appsync.MappingTemplate.fromString(`
              $utils.toJson($utils.rds.toJsonObject($ctx.result)[0])
            `),
        });

        rdsDS.createResolver({
            typeName: 'Query',
            fieldName: 'post',
            requestMappingTemplate: appsync.MappingTemplate.fromString(`
            {
              "version": "2018-05-29",
              "statements": [
                "SELECT * FROM posts where id='$ctx.args.id'"
              ]
            }
            `),
            responseMappingTemplate: appsync.MappingTemplate.fromString(`
              $utils.toJson($utils.rds.toJsonObject($ctx.result)[0][0])
            `),
        });

        rdsDS.createResolver({
            typeName: 'Query',
            fieldName: 'post',
            requestMappingTemplate: appsync.MappingTemplate.fromString(`
            {
              "version": "2018-05-29",
              "statements": [
                "SELECT * FROM posts where id='$ctx.args.id'"
              ]
            }
            `),
            responseMappingTemplate: appsync.MappingTemplate.fromString(`
              $utils.toJson($utils.rds.toJsonObject($ctx.result)[0][0])
            `),
        });

        rdsDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'addPost',
            requestMappingTemplate: appsync.MappingTemplate.fromString(`
            {
                "version": "2018-05-29",
                "statements": [
                  "INSERT INTO posts(id,author,title,content) VALUES (:id, :author, :title, :content)",
                  "SELECT * FROM posts WHERE id = :id"
                ],
                "variableMap": {
                  ":id": $util.toJson($util.autoId()),
                  ":author": $util.toJson($ctx.args.author)
                  ":title": $util.toJson($ctx.args.title)
                  ":content": $util.toJson($ctx.args.content)
                }
            }
            `
            ),
            responseMappingTemplate: appsync.MappingTemplate.fromString(`
                $utils.toJson($utils.rds.toJsonObject($ctx.result)[1][0])
              `),
        });

        // Set up a resolver for mutation
        rdsDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'updatePost',
            requestMappingTemplate: appsync.MappingTemplate.fromString(`
            {
                "version": "2018-05-29",
                "statements": [
                  "Update posts SET title = :title, content= :content where id = :id",
                  "SELECT * FROM posts WHERE id = :id"
                ],
                "variableMap": {
                  ":id": $util.toJson($ctx.args.id),
                  ":title": $util.toJson($ctx.args.title)
                  ":content": $util.toJson($ctx.args.content)
                }
            }
            `
            ),
            responseMappingTemplate: appsync.MappingTemplate.fromString(`
                $utils.toJson($utils.rds.toJsonObject($ctx.result)[1][0])
              `),
        });

        rdsDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'deletePost',
            requestMappingTemplate: appsync.MappingTemplate.fromString(`
            {
                "version": "2018-05-29",
                "statements": [
                  "SELECT * FROM posts WHERE id = :id"
                  "Delete from posts where id = :id",
                ],
                "variableMap": {
                  ":id": $util.toJson($ctx.args.id),
                }
            }
            `
            ),
            responseMappingTemplate: appsync.MappingTemplate.fromString(`
                $utils.toJson($utils.rds.toJsonObject($ctx.result)[0][0])
            `),
        });
    }
}
