import AWS from 'aws-sdk';
import fs from 'fs';

// Set your AWS credentials and region
AWS.config.update({
  accessKeyId: 'your-access-key',
  secretAccessKey: 'your-secret-key',
  region: 'your-region',
});

// Create a new Textract client
const textract = new AWS.Textract();

// Function to read the PDF file into a buffer
const readPdf = (filePath: fs.PathOrFileDescriptor) => {
  return fs.readFileSync(filePath);
};

// Function to call the detectDocumentText operation of the Textract service
const detectText = async (buffer: Buffer) => {
  const response = await textract.detectDocumentText({
    Document: {
      Bytes: buffer,
    },
  });
  return response;
};

// Function to process the response from the Textract service and extract the text from the PDF
const extractText = (response: any) => {
  const blocks = response.Blocks;
  const texts = blocks
    .filter((block: {BlockType: string}) => block.BlockType === 'LINE')
    .map((block: {Text: any}) => block.Text);
  return texts;
};

// Function to map the extracted text to specific values in a JSON object
const mapToJson = (texts: any[]) => {
  const json = {
    title: texts[0],
    author: texts[1],
    content: texts.slice(2).join('\n'),
  };
  return json;
};

// Function to convert the JSON object to a JSON string
const stringifyJson = (json: {title: any; author: any; content: any}) => {
  return JSON.stringify(json);
};

// Function to extract text from a PDF and map it to a JSON object
const pdfToJson = async (filePath: any) => {
  // Read the PDF file into a buffer
  const buffer = readPdf(filePath);

  // Call the detectDocumentText operation of the Textract service
  const response = await detectText(buffer);

  // Process the response to extract the text from the PDF
  const texts = extractText(response);

  // Map the extracted text to specific values in a JSON object
  const json = mapToJson(texts);

  // Convert the JSON object to a JSON string
  const jsonStr = stringifyJson(json);

  // Return the JSON string
  return jsonStr;
};
