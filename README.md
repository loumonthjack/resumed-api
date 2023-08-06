
# Resume Website Generator

The user will input their resume, choose a template, and then receive a link to their website populated with there resume data. The project is written in TypeScript and uses React for the frontend and Express/Apollo GraphQL for the backend.

## Acknowledgements

 - [StyleShout - Free Templates](https://styleshout.com)

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
| `websiteUpsert`      | `Mutation` | Create or Update Website of User |
| `resumeUpsert`      | `Mutation` | Create or Update Resume of User |
| `websiteDelete`      | `Mutation` | Delete Website of User |
| `resumeUpload`      | `Mutation` | Upload and Save Resume of User |
| `userUpdate`      | `Mutation` | Update User Info |
| `login`      | `Mutation` | Login User, Sends Auth Code via Email |
| `verify`      | `Mutation` | Verify User, Takes Auth Code and Starts Session |
| `logout`      | `Mutation` | End Session, Logout User |
| `register`      | `Mutation` | Create User |

## Installation


```LOCAL
Run Locally: 

cd resumed-backend
touch .env
nvm use 17
npm install
npx prisma migrate dev --name init --preview-feature
npm start
```

```DOCKER
Run in Container:

cd resumed-backend
touch .env
docker build --pull --rm -f "Dockerfile" -t resumed_api:latest "."
docker compose -f "docker-compose.yaml" up -d --build
```
    

## Tech Stack

**Server:** Node, Express, GraphQL, Prisma

**Services:** Amazon Web Services, OpenAI, Sendgrid

**Database:** Postgres


## Roadmap

~~- Choose From Multiple React Templates~~

~~- Generate Subdomains for All Sites `username.resumed.website`~~

- Generate a SSL Certificate (ACM) & CDN Distribution (CloudFront) for Each Site

- Create a Custom Domain

- Create a CDN Distribution on AWS

- Ability To Store Files In Cloud w/ Set Limits
