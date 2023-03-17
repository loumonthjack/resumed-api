import {DocumentType, ResumeType} from '../types';
import {ErrorResponse, SuccessResponse} from '../util/message';
import prisma from '../db';
import fs from 'fs';
import path from 'path';
import {isLocal, s3} from '../util/helper';

interface Response {
  message?: string;
  document?: DocumentType;
  code: number;
}
class ExportService {
  fileLocation = (type: string, userId: string) =>
    path.join(__dirname, `../tmp/${userId}.${type}`);
  async get(userId: string): Promise<Response> {
    const response = await prisma.document.findFirst({
      where: {
        userId: userId,
      },
    });
    return SuccessResponse(null, {document: response});
  }
  async create(
    args: Omit<DocumentType, 'id'>,
    userId: string
  ): Promise<Response> {
    if (!args.type) return ErrorResponse('invalid');
    const resume = await prisma.resume.findFirst({
      where: {
        userId: userId,
      },
    });
    if (!resume) return ErrorResponse();
    let type = '';
    if (args.type === 'pdf') {
      const pdfFileLink = await this.createPdfFile(resume, userId);
      if (!pdfFileLink) return ErrorResponse();
      type = pdfFileLink;
    }
    if (args.type === 'json') {
      const jsonFileLink = await this.createJsonFile(resume, userId);
      if (!jsonFileLink) return ErrorResponse();
      type = jsonFileLink;
    }
    if (args.type === 'html') {
      const htmlFileLink = await this.createHtmlFile(resume, userId);
      if (!htmlFileLink) return ErrorResponse();
      type = htmlFileLink;
    }
    if (args.type === 'txt') {
      const txtFileLink = await this.createTextFile(resume, userId);
      if (!txtFileLink) return ErrorResponse();
      type = txtFileLink;
    }
    return SuccessResponse(null, {
      document: {[args.type]: type, userId: userId},
    });
  }
  async uploadFile(userId: string, type: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    const file = fs.readFileSync(
      path.join(__dirname, `../tmp/${userId}.${type}`)
    );
    if (!file) return null;
    await s3
      .putObject({
        Bucket: `${user?.firstName}-${user?.lastName}${
          isLocal ? '.local' : ''
        }.resumed.website`,
        Key: `docs/${user?.firstName}-${user?.lastName}-resume.${type}`,
        Body: file,
        ACL: 'public-read',
      })
      .promise()
      .catch(err => {
        if (err) {
          console.log(err);
          return null;
        }
      });
    return `http://${user?.firstName}-${user?.lastName}${
      isLocal ? '.local' : ''
    }.resumed.website/docs/${user?.firstName}-${user?.lastName}-resume.${type}`;
  }
  async createPdfFile(resume: any, userId: string) {
    const data = '';
    const file = this.fileLocation('pdf', userId);
    fs.writeFileSync(file, data);
    const upload = await this.uploadFile(userId, 'pdf');
    if (!upload) return null;
    fs.unlinkSync(file);
    return upload;
  }
  async createJsonFile(resume: any, userId: string) {
    const data = JSON.stringify(resume);
    const file = this.fileLocation('json', userId);
    fs.writeFileSync(file, data);
    const upload = await this.uploadFile(userId, 'json');
    if (!upload) return null;
    fs.unlinkSync(file);
    return upload;
  }
  async createHtmlFile(resume: any, userId: string) {
    const data = '';
    const file = this.fileLocation('html', userId);
    fs.writeFileSync(file, data);
    const upload = await this.uploadFile(userId, 'html');
    if (!upload) return null;
    fs.unlinkSync(file);
    return upload;
  }
  async createTextFile(resume: any, userId: string) {
    const data = '';
    const file = this.fileLocation('txt', userId);
    fs.writeFileSync(file, data);
    const upload = await this.uploadFile(userId, 'txt');
    if (!upload) return null;
    fs.unlinkSync(file);
    return upload;
  }
}

const Export = new ExportService();
export default Export;
