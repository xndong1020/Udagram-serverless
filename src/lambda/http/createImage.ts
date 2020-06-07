import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import "source-map-support/register";
import * as AWS from "aws-sdk";
import * as uuid from "uuid";

import * as middy from "middy";
import { cors } from "middy/middlewares";

const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3({
  signatureVersion: "v4", // Use Sigv4 algorithm
});

const groupsTable = process.env.GROUPS_TABLE;
const imagesTable = process.env.IMAGES_TABLE;
const bucketName = process.env.IMAGES_S3_BUCKET;
const singedUrlExpiration = process.env.IMAGES_SIGNED_URL_EXPIRATION;

export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("Caller event", event);

    const groupId = event.pathParameters.groupId;
    const validGroupId = await groupExists(groupId);

    if (!validGroupId) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Group does not exist",
        }),
      };
    }

    const parsedBody = JSON.parse(event.body);
    const imageId = uuid.v4();

    // To generate S3 signed url
    const presignedUrl = s3.getSignedUrl("putObject", {
      // The URL will allow to perform the PUT operation
      Bucket: bucketName, // Name of an S3 bucket
      Key: imageId, // id of an object this URL allows access to
      Expires: parseInt(singedUrlExpiration), // A URL is only valid for 5 minutes
    });

    const newItem = {
      ...parsedBody,
      imageId,
      groupId,
      timestamp: new Date().toISOString(),
      imageUrl: `https://${bucketName}.s3.amazonaws.com/${imageId}`,
    };

    await docClient
      .put({
        TableName: imagesTable,
        Item: newItem,
      })
      .promise();

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ newItem, presignedUrl }),
    };
  }
);

async function groupExists(groupId: string) {
  const result = await docClient
    .get({
      TableName: groupsTable,
      Key: {
        id: groupId,
      },
    })
    .promise();

  console.log("Get group: ", result);
  return !!result.Item;
}

handler.use(
  cors({
    credentials: true, // equals to "Access-Control-Allow-Credentials": true
  })
);
