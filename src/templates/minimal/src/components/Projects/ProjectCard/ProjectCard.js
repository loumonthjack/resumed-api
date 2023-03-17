import React from "react";
import { ProjectList } from "../../../data/newProjectData";
import {
  Card,
  CardRight,

} from "./ProjectCardElements";
function ProjectCard() {
  return (
    <>
      {ProjectList.map((list, index) => (
        <Card key={index}>
          {list.title &&
            <CardRight>
              <h4>{list.title}</h4>
              <p>{list.description === null ? list.description : ''}</p>
            </CardRight>
          }
          {list.school &&
            <CardRight>
              <h4>{list.school}</h4>
              <p>{list.degree && list.degree + ' in ' + list.field}</p>
            </CardRight>
          }
        </Card>
      ))}
    </>
  );
}

export default ProjectCard;
