import {S3} from 'aws-sdk/clients/all';
import {AWSError} from 'aws-sdk/lib/error';
import {s3} from './helper';

class Upload {
  // Function to check the size of an object in an S3 bucket
  async checkObjectSize(
    bucket: string,
    key: string
  ): Promise<number | undefined> {
    const response = await s3
      .getObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();
    return response.ContentLength;
  }

  // Function to check if the object size is within the allowed limit
  async checkStorageLimit(
    bucket: string,
    key: string,
    limit: number
  ): Promise<boolean> {
    const objectSize = await this.checkObjectSize(bucket, key).then(
      (response: any) => {
        return response.ContentLength;
      }
    );
    return objectSize <= limit;
  }

  // Function to handle file uploads and enforce the storage limit
  async handleFileUpload(
    bucket: string,
    key: string,
    limit: number
  ): Promise<S3.ManagedUpload.SendData> {
    if (await this.checkStorageLimit(bucket, key, limit)) {
      // Perform the file upload...
      const upload = await s3
        .upload({Bucket: bucket, Key: key})
        .promise()
        .catch((err: AWSError) => {
          throw new Error(err.message);
        });

      return upload;
    } else {
      throw new Error('File exceeds storage limit');
    }
  }
}

export default Upload;
