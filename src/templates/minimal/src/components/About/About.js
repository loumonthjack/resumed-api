import React from "react";
import { stackList, UserInfo } from "../../data/newProjectData";
import {
  Technologies,
  Tech,
  TechName,
  ContactWrapper,
} from "./AboutElements";
function About() {
  return (
    <ContactWrapper id="about">
      <div className="Container">
        <div className="SectionTitle">About Me</div>
        <div className="BigCard">
          
          <div className="AboutBio">
            Hello! My name is <strong>{UserInfo.name}</strong> {UserInfo.bio}
          </div>
          <div className="AboutBio tagline2">
            I have become confident using the following skills.
          </div>
          <Technologies>
            {stackList.map((stack, index) => (
              <Tech key={index} className="tech">
                <TechName>{stack.name}</TechName>
              </Tech>
            ))}
          </Technologies>
        </div>
      </div>
    </ContactWrapper>
  );
}

export default About;
