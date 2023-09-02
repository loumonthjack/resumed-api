import path from 'path';
import fs from 'fs';
import {ResumeType, UserType} from '../types';
import fse from 'fs-extra';
import {newBasicApp, newMinimalApp} from '../templates/dataFiles';
import {TEMPLATE} from '../constants';
import {generateHeadline, getFileType, isDirectory} from '../util/helper';
import {execSync} from 'child_process';
import {Resume} from '@prisma/client';
import ResumeDB from '../models/resume';
import BaseService from './base';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
import Mustache from 'mustache';
import {uploadToUserBucket} from './external/aws';

const BASE_PATH = '../templates';
export const AUTH_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/auth.html`))
  .toString();
export const WELCOME_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/welcome.html`))
  .toString();
export const MODERN_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/modern/index.html`))
  .toString();
export const BASIC_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/basic/index.html`))
  .toString();
export const MINIMAL_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/minimal/index.html`))
  .toString();
export const renderTemplate = (template: any, data: any) => {
  return Mustache.render(template, data);
};

class Template extends BaseService<'TemplateService'> {
  user: UserType;
  resume!: ResumeType;
  templateName: string;
  theme: string;
  constructor(templateName: string, theme: string, user: UserType) {
    super();
    this.templateName = templateName.toLocaleLowerCase();
    this.theme = theme.toLocaleLowerCase();
    this.user = {
      ...user,
      firstName:
        user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1),
      lastName: user.lastName.charAt(0).toUpperCase() + user.lastName.slice(1),
      email: user.email.charAt(0).toUpperCase() + user.email.slice(1),
    };
  }
  userPath(): string {
    const userFolder = path.join(__dirname, `../tmp/${this.user.id}`);
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder);
    }
    return userFolder;
  }
  templatePath(): string | null {
    if (!this.isValidTemplate()) {
      return null;
    }
    return path.join(__dirname, `../templates/${this.templateName}`);
  }
  async userResume(): Promise<Resume | null> {
    return await ResumeDB.getByUserId(this.user.id);
  }
  isValidTemplate(): boolean | null {
    if (
      this.isBasicTemplate() ||
      this.isModernTemplate() ||
      this.isMinimalTemplate()
    ) {
      return true;
    }
    return null;
  }
  isBasicTemplate = (): boolean => this.templateName === TEMPLATE.BASIC;
  isMinimalTemplate = (): boolean => this.templateName === TEMPLATE.MINIMAL;
  isModernTemplate = (): boolean => this.templateName === TEMPLATE.MODERN;
  async newFile(): Promise<string | null> {
    if (!this.isValidTemplate()) {
      return null;
    }

    if (this.isBasicTemplate()) {
      return await newBasicApp(await this.userResume(), this.user);
    } else if (this.isMinimalTemplate()) {
      return await newMinimalApp(
        await this.userResume(),
        this.user,
        await generateHeadline()
      );
    }

    return null;
  }
  create = async (bucket: string): Promise<boolean | null> => {
    const templates: any = {
      basic: BASIC_HTML,
      minimal: MINIMAL_HTML,
      modern: MODERN_HTML,
    };
    // first letter of first name and last name
    const title = `${this.user.firstName
      .charAt(0)
      .toUpperCase()}${this.user.lastName.charAt(0).toUpperCase()}`;
    const resume = await this.userResume();
    if (!resume) {
      return null;
    }
    if (resume?.skills?.length > 5) {
      resume.skills = resume.skills.slice(0, 5);
    }
    // for each resume skill append percentNumber to the object
    resume.skills = resume.skills.map((skill: any) => {
      // percentNumber will be random from 75 to 100, increment of 5
      skill.percent = Math.floor(Math.random() * 5) * 5 + 75;
      return {
        ...skill,
        percentNumber: `${skill.percent}`,
      };
    });
    const experience = resume.experience && (resume.experience[0] as any);
    const newFile = renderTemplate(templates[this.templateName], {
      title,
      user: this.user,
      resume,
      currentPostion: experience.position,
      lightBackground: this.theme === 'light',
    });
    await uploadToUserBucket(bucket, newFile, 'index.html', this.templateName);
    for (const file of fs.readdirSync(
      path.join(__dirname, `../templates/${this.templateName}`)
    )) {
      if (file !== 'index.html') {
        if (file.includes('.')) {
          await uploadToUserBucket(bucket, file, file, this.templateName);
        } else {
          for (const subFile of fs.readdirSync(
            path.join(__dirname, `../templates/${this.templateName}/${file}`)
          )) {
            if (subFile.includes('.')) {
              await uploadToUserBucket(
                bucket,
                subFile,
                `${file}/${subFile}`,
                this.templateName
              );
            } else {
              for (const subSubFile of fs.readdirSync(
                path.join(
                  __dirname,
                  `../templates/${this.templateName}/${file}/${subFile}`
                )
              )) {
                if (subSubFile.includes('.')) {
                  await uploadToUserBucket(
                    bucket,
                    subSubFile,
                    `${file}/${subFile}/${subSubFile}`,
                    this.templateName
                  );
                } else {
                  for (const subSubSubFile of fs.readdirSync(
                    path.join(
                      __dirname,
                      `../templates/${this.templateName}/${file}/${subFile}/${subSubFile}`
                    )
                  )) {
                    if (subSubSubFile.includes('.')) {
                      await uploadToUserBucket(
                        bucket,
                        subSubSubFile,
                        `${file}/${subFile}/${subSubFile}/${subSubSubFile}`,
                        this.templateName
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return true;
  };

  async copyFiles(): Promise<boolean | null> {
    const templatePath = this.templatePath();
    if (!templatePath) {
      return null;
    }
    fse.copy(templatePath, this.userPath(), (err: unknown) => {
      if (err) {
        return null;
      }
      return true;
    });
    return true;
  }
  buildApp = async (dataFile: string): Promise<boolean | null> => {
    const installPackages = async () => {
      try {
        await execSync(`${npm} install`, {
          cwd: this.userPath(),
        });
        return true;
      } catch (error) {
        return null;
      }
    };

    const buildReact = async () => {
      try {
        await execSync(`${npm} run-script build`, {
          cwd: this.userPath(),
        });
        return true;
      } catch (error) {
        return null;
      }
    };
    await new Promise(resolve => setTimeout(resolve, 2500));
    const rewrite = await this.writeFile(dataFile);
    if (!rewrite) {
      return null;
    }
    await new Promise(resolve => setTimeout(resolve, 2500));
    const install = await installPackages();
    if (!install) {
      return null;
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
    const build = await buildReact();
    if (!build) {
      return null;
    }
    return true;
  };
  async writeFile(file: string): Promise<boolean | null> {
    const override = {flag: 'r+'};
    const create = {flag: 'ax'};
    if (this.isBasicTemplate()) {
      try {
        const dataFile = `${this.userPath()}/src/newProfile.js`;
        fs.existsSync(dataFile)
          ? await fs.writeFileSync(dataFile, file, override)
          : await fs.writeFileSync(dataFile, file, create);
      } catch (error) {
        return null;
      }
    } else if (this.isMinimalTemplate()) {
      const dataFile = `${this.userPath()}/src/data/newProjectData.js`;
      try {
        fs.existsSync(dataFile)
          ? await fs.writeFileSync(dataFile, file, override)
          : await fs.writeFileSync(dataFile, file, create);
        return true;
      } catch (error) {
        return null;
      }
    }
    return null;
  }
}

export default Template;
