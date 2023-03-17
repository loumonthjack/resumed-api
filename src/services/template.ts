import path from 'path';
import fs from 'fs';
import {ResumeType, UserType} from '../types';
import fse from 'fs-extra';
import {newBasicApp, newMinimalApp, newBasicCss} from '../templates/dataFiles';
import {TEMPLATE} from '../constants';
import {generateHeadline} from '../util/helper';
import {execSync} from 'child_process';
import {Resume} from '@prisma/client';
import ResumeDB from '../models/resume';
import BaseService from './base';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

class Template extends BaseService<'TemplateService'> {
  user: UserType;
  resume!: ResumeType;
  colors: string;
  templateName: string;
  constructor(templateName: string, colors: string, user: UserType) {
    super();
    this.colors = colors;
    this.templateName = templateName.toLocaleLowerCase();
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
      //this.isModernTemplate() ||
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
  async newCssFile(): Promise<string | null> {
    if (!this.isValidTemplate()) {
      return null;
    }
    if (this.isBasicTemplate()) {
      return newBasicCss(this.colors);
    }
    return null;
  }
  create = async (): Promise<boolean | null> => {
    const copyTemplate = await this.copyFiles();
    if (!copyTemplate) {
      return null;
    }
    const writeFile = await this.newFile();
    if (!writeFile) {
      return null;
    }
    const writeCssFile = await this.newCssFile();
    if (!writeCssFile) {
      return null;
    }
    const processDirectory = await this.buildApp(writeFile, writeCssFile);
    if (!processDirectory) {
      return null;
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
  buildApp = async (
    dataFile: string,
    cssFile: string
  ): Promise<boolean | null> => {
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
    const rewrite = await this.writeFile(dataFile, cssFile);
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
  async writeFile(file: string, cssFile: string): Promise<boolean | null> {
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
      try {
        const styleFile = `${this.userPath()}/src/styles/style.css`;
        fs.existsSync(styleFile) && (await fs.unlinkSync(styleFile));
        fs.existsSync(styleFile)
          ? await fs.writeFileSync(styleFile, cssFile, override)
          : await fs.writeFileSync(styleFile, cssFile, create);
        return true;
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
