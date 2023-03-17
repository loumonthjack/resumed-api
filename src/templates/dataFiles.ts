import type {UserType} from '../types';

export const newBasicCss = async (
  colors: string
): Promise<string> => `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Anonymous+Pro:wght@700&display=swap');
@import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro');
:root {
    --primary-color:  ${colors};
    --hover-color:  grey;
}`;

export const newBasicApp = async (
  resume: any,
  user: UserType
): Promise<string | null> => {
  if (
    !resume.awards ||
    !resume.education ||
    !resume.experience ||
    !resume.skills
  )
    return null;

  return `
const profilePictureURL = "${user.profilePicture}";
// Change website animations
const animation = {
  // make it false to switch off fade-up animation
  animate: true,
  // animation playing duration
  duration: 750,
  // if true, animation plays only once when element comes on screen
  once: false,
};
// Change your display name on tha landing display
const header = {
  name: "${user.firstName + ' ' + user.lastName}",
};
const backgroundTypes = ["Snow", "Particle"]
const background = {
  // Options: Snow or Particle
  type: backgroundTypes[Math.floor(Math.random() * backgroundTypes.length)],
};
// Write a para about yourself here
// To update your image, go to './styles/images.css'
const section2title = "About Me";
const about = {
  paragraph:
    "${resume.bio}",
};
// Edit your skill and the percentage you know about it
// To Add a skill, copy any one below and paste it after the last comma
const skillsBar = [${resume.skills.map(
    (skill: any, index: number) => `{
    name: "${skill.name}"
    }`
  )}];
// Edit your projects, its name, your skills used to make it, and the url.
// You can omit freely anything if you dont have it
// To Add a Project, copy any one below and paste it after the last comma and increment the id's project number
const section3Title = "Education";
const projects = [${resume.education.map(
    (edu: any, index: number) => `{
    id: "project${index + 1}",
    name: "${edu.school}",
    skills: ["${edu.degree}"],
    url: "#",
    }`
  )}];
// Edit your Miscellaneous Activities, its name and the url.
// You can omit freely anything if you dont have it
// To Add a Activity, copy any one below and paste it after the last comma and increment the id's Miscellaneous number
const section4Title = "Experience";
const miscellaneous = [${resume.experience.map(
    (exp: any, index: number) => `{
    id: "miscellaneous${index + 1}",
    name: "${exp.position} at ${exp.company}",
    url: "#",
    }`
  )}];
// Contact form text, and Formspree link(to send a submit contact through their API as in contact.js)
// To get your own jotform link, go to https://formspree.io/
// If you hacve the link already, paste it in the contactUrl below
const section5Title = "Get in Touch";
const contact = {
    email:"${user.email}",
  pitch:
    "I'm currently looking for new opportunities. If you have any questions, please feel free to reach out.",
  copyright: "${user.firstName + ' ' + user.lastName}",
  contactUrl: "",
};
// Paste your respective social media links. You can omit any if you dont have it
// Upload your resume in your drive, get the shaareable link and paste it in the resume section
const social = {
  github: "https://github.com",
  facebook: "https://facebook.com",
  // twitter:  "https://twitter.com",
  instagram: "https://instagram.com",
  linkedin: "https://linkedin.com",
};
// Dont change anything here
export {
  profilePictureURL,
  animation,
  header,
  background,
  about,
  skillsBar,
  projects,
  miscellaneous,
  contact,
  social,
  section2title,
  section3Title,
  section4Title,
  section5Title,
};`;
};

export const newMinimalApp = async (
  resume: any,
  user: UserType,
  headline: string
) => {
  const intersection = (arr: any[]) =>
    arr.reduce((a: any, e: any) => [...a, ...e], []);
  const newResume = intersection([resume.education, resume.experience]);
  const filterResume = newResume.filter((item: any) => {
    return Object.keys(item).filter(
      key => item[key] !== null && item[key] !== undefined
    );
  });

  return `
  export const UserInfo = {
    name: "${user.firstName} ${user.lastName}",
    bio: "${resume.bio}",
    email: "${user.email}",
  }
  
  export const headline = "${headline}"
  
  export const ProjectList = [
        ${filterResume.map((edu: any, index: number) => {
          if (edu.school) {
            return `{
                school: "${edu.school}",
                degree: "${edu.degree}",
                field: "${edu.field}",
            }`;
          } else if (edu.company) {
            return `{
                title: "${`${edu.position} at ${edu.company}`}",
                description: "${edu.description}",
          }`;
          }
        })}
  ];
  
  
  export const stackList = [
    ${resume?.skills.map(
      (skill: any, index: number) => `{
        img: "https://raw.githubusercontent.com/gurupawar/website/main/src/Assets/skill/responsive.svg",
          name: "${skill.name}"
          }
          `
    )}
  ];
  `;
};
