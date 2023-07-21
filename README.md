
# Resume Website Generator

The user will input their resume, choose a template, and then receive a link to their website populated with there resume data. The project is written in TypeScript and uses React for the frontend and Express/Apollo GraphQL for the backend.

## Acknowledgements

 - [Portfolio Template By Kaustubh Mishra](https://github.com/kaustubhai/portfolio-template)
 - [Resume Template By @gurupawar](https://github.com/gurupawar/portfolio-react)

## Authors

- [@loumonthjack](https://www.github.com/loumonthjack)


## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`DATABASE_URL`
`PORT`
`SENDGRID_API_KEY`
`SERVER_URL`
`SERVER_ALIAS`
`FRONTEND_URL`
`FRONTEND_ALIAS`
`AWS_HOSTED_ZONE_ID`
`JWT_SECRET_KEY`
`AWS_BUCKET_NAME`
`NODE_ENV`
`AWS_ACCESS_KEY_ID`
`AWS_SECRET_ACCESS_KEY`
`AWS_REGION`
`OPENAI_API_KEY`
`STRIPE_SECRET_KEY`
`STRIPE_WEBHOOK_KEY`
## API Reference

#### Login

```http
  POST /auth/login
```

| Body | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `email` | `string` | **Required**. Your Email Address |

#### Verify

```http
  POST /auth/verify
```

| Body | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `email` | `string` | **Required**. Your Email Address |
| `code`  | `string` | **Required**. Your Auth Code |

#### Register

```http
  POST /auth/register
```

| Body | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `email`      | `string` | **Required**. Your Email Address |
| `firstName`      | `string` | **Required**. Your First Name |
| `lastName`      | `string` | **Required**. Your Last Name |

#### GraphQL

```http
  POST /graphql
```
**Required Header:** { Authorization: Bearer `token`}
| Body | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `resume`      | `Query` | Get Resume of User |
| `resumes`      | `Query` | Get All Resumes |
| `website`      | `Query` | Get Website of User |
| `websites`      | `Query` | Get All Websites |
| `user`      | `Query` | Get User Info |
| `createWebsite`      | `Mutation` | Create or Update Website of User |
| `createResume`      | `Mutation` | Create Resume of User |
| `updateResume`      | `Mutation` | Update Resume of User |
| `deleteResume`      | `Mutation` | Delete Resume of User |
## Installation


```LOCAL
Run Locally: 

cd portfolio-server
touch .env
nvm use 17
npm install
npx prisma migrate dev --name init --preview-feature
npm start
```

```DOCKER
Run in Container:

cd portfolio-server
touch .env
docker build --pull --rm -f "Dockerfile" -t portfolioserver:latest "."
docker compose -f "docker-compose.yaml" up -d --build
```
    
## Features

- Create S3 Web Hosting Bucket
- Upload Files to S3
- Generate Random Quote
- Generate Answer from AI
- Inject Data Into JS/HTML File
- Generate Website with Resume Data


## Tech Stack

**Server:** Node, Express, GraphQL, Prisma

**Services:** Amazon Web Services, OpenAI, Sendgrid

**Database:** Postgres


## Roadmap

~~- Choose From Multiple React Templates~~

- Generate Subdomains for All Sites

- Generate a SSL Certificate & CDN Distribution

- Create a Custom Domain

- Create a CDN Distribution on AWS

- Ability To Store Files In Cloud w/ Set Limits
