// Import node modules
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

// Import custom modules
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));

// master will be set to TRUE if current git branch name is 'master'
const master = ('master' === fs.readFileSync(path.join(process.cwd(), '.git/HEAD'), { encoding: 'utf8' }).match(/ref: refs\/heads\/([^\n]+)/)[1]);

module.exports = Auth = {
  authorize: tokenFromRequest => {
    try {
      if (!master) Logger.warning(`Running on DEV mode`);
      let authPath;
      if (master) authPath = path.join(process.cwd(), 'conf/user_auth.yml');
      else authPath = path.join(process.cwd(), 'conf/dev_auth.yml');
      const obj = yaml.safeLoad(fs.readFileSync(authPath, 'utf8'));

      for (user in obj) {
        if (obj[user] === tokenFromRequest) {
          Logger.info(`Request authorized`);
          Logger.info(`Matching key was sent from ${user}`);
          return true;
        }
      }
      Logger.info(`Request denied`);
      return false;
    }
    catch (e) {
      Logger.error(e);
      Logger.critical(`Request denied - "conf/user_auth.yml" not found`);
      Logger.critical(`Please run "prepare.sh" and edit "conf/user_auth.yml" as needed.`);
      process.kill(process.pid);
    }
  },
};