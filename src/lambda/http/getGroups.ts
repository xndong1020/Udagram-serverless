import * as AWS from "aws-sdk";
import "source-map-support/register";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import * as middy from "middy";
import { cors } from "middy/middlewares";

const docClient = new AWS.DynamoDB.DocumentClient();

const groupsTable = process.env.GROUPS_TABLE;

export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("Processing event", event);
    try {
      const promise = docClient
        .scan({
          TableName: groupsTable,
        })
        .promise();
      const result = await promise;
      const items = result.Items;

      const response = {
        statusCode: 200,
        body: JSON.stringify({
          items,
        }),
      };
      return response;
    } catch (err) {
      const response = {
        statusCode: 400,
        body: JSON.stringify({
          error: err,
        }),
      };
      return response;
    }
  }
);

handler.use(
  cors({
    credentials: true, // equals to "Access-Control-Allow-Credentials": true
  })
);
