import Resume from '../src/services/resume';
import User from '../src/services/user';
import Website from '../src/services/website';

const data = {
  email: 'jroppy@gmail.com',
  firstName: 'roppy',
  lastName: 'jack',
};

const getUser = async () => {
  const response = await User.getByEmail(data.email);
  if (response.code !== 200) throw new Error(response.message);
  return response.user;
};

const createUser = async () => {
  const response = await User.create({
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    profilePicture: null,
    externalId: null,
    lastLogin: null,
    type: null,
  });
  if (response.code !== 200) throw new Error(response.message);
  return response.user;
};

const createResume = async () => {
  const user = await getUser();
  const data = {
    userId: user?.id as string,
    bio: 'I am a software engineer and a full stack developer with 5 years of experience in the industry. I have worked on a variety of projects and have a strong understanding of the software development life cycle. I am passionate about building scalable and maintainable software.',
    education: [
      {
        school: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        start: String(2015),
        end: String(2019),
      },
      {
        school: 'University of Standford',
        degree: 'Master of Science',
        field: 'Electrical Engineering',
        start: String(2019),
        end: String(2022),
      },
    ],
    experience: [
      {
        company: 'Google',
        position: 'Software Engineer',
        start: String(2019),
        end: String(2020),
      },
      {
        company: 'Facebook',
        position: 'Software Engineer',
        start: String(2020),
        end: String(2021),
      },
    ],
    skills: [
      {name: 'Javascript'},
      {name: 'Typescript'},
      {name: 'React'},
      {name: 'Node'},
      {name: 'GraphQL'},
    ],
    awards: [
      {
        title: 'Best Software Engineer',
        date: String(2020),
      },
    ],
  };
  const response = await Resume.create(data);
  if (response.code !== 200) throw new Error(response.message);
  return response.resume;
};

const createWebsite = async () => {
  const user = await getUser();
  const response = await Website.create({
    templateName: 'basic',
    url: '',
    status: 'pending',
    userId: user?.id as string,
    colors: '',
  });
  if (response.code !== 200) throw new Error(response.message);
  return response.website;
};

const main = async () => {
  await createUser();
  await createResume();
  await createWebsite();
};
main();
