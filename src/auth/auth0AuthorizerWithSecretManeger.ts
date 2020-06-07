import { CustomAuthorizerEvent, CustomAuthorizerResult } from "aws-lambda";
import "source-map-support/register";

import * as middy from "middy";
import { secretsManager } from "middy/middlewares";

import { verify } from "jsonwebtoken";

import { JwtToken } from "./JwtToken";

const secretId = process.env.AUTH0_SECRET_ID;
const secretField = process.env.AUTH0_SECRET_FIELD;

export const handler = middy(
  async (
    event: CustomAuthorizerEvent,
    context
  ): Promise<CustomAuthorizerResult> => {
    try {
      console.log("context", context);
      const decodedToken = verifyToken(
        event.authorizationToken,
        context.AUTH0_SECRET[secretField]
      );

      const { sub } = decodedToken;
      console.log("User was authorized", decodedToken);

      return {
        principalId: sub,
        policyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Action: "execute-api:Invoke",
              Effect: "Allow",
              Resource: "*",
            },
          ],
        },
      };
    } catch (e) {
      console.log("User was not authorized", e.message);

      return {
        principalId: "mock user",
        policyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Action: "execute-api:Invoke",
              Effect: "Deny",
              Resource: "*",
            },
          ],
        },
      };
    }
  }
);

const verifyToken = (authHeader: string, secret: string): JwtToken => {
  if (!authHeader) throw new Error("No authentication header");

  if (!authHeader.toLowerCase().startsWith("bearer "))
    throw new Error("Invalid authentication header");

  const split = authHeader.split(" ");
  const token = split[1];

  return verify(token, secret) as JwtToken;
};

handler.use(
  secretsManager({
    cache: true,
    cacheExpiryInMillis: 60000,
    // Throw an error if can't read the secret
    throwOnFailedCall: true,
    secrets: {
      AUTH0_SECRET: secretId, // what secrets from Secret Manager it should fetch. once fetched, will save in context.AUTH0_SECRET
    },
  })
);
