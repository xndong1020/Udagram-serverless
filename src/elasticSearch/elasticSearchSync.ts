import { DynamoDBStreamEvent, DynamoDBStreamHandler } from "aws-lambda";
import "source-map-support/register";
import * as elasticsearch from "elasticsearch";
import * as httpAwsEs from "http-aws-es";

const esHost = process.env.ES_ENDPOINT;

const es = new elasticsearch.Client({
  hosts: [esHost],
  connectionClass: httpAwsEs,
});

export const handler: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent
) => {
  console.log("Processing events batch from DynamoDB", JSON.stringify(event));

  for (const record of event.Records) {
    console.log("Processing record", JSON.stringify(record));

    // we only care about new images uploaded to s3
    if (record.eventName !== "INSERT") continue;

    // again we only care about new image
    const newItem = record.dynamodb.NewImage;

    const imageId = newItem.imageId.S;

    const body = {
      imageId: newItem.imageId.S,
      groupId: newItem.groupId.S,
      imageUrl: newItem.imageUrl.S,
      title: newItem.title.S,
      timestamp: newItem.timestamp.S,
    };

    // save to elastic index
    await es.index({
      index: "images-index",
      type: "images",
      id: imageId,
      body,
    });
  }
};
