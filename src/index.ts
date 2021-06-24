import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';
import { LabIcon } from '@jupyterlab/ui-components';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ILauncher } from '@jupyterlab/launcher';

import { requestAPI } from './handler';

import { IFrame } from '@jupyterlab/apputils';
import { PageConfig } from '@jupyterlab/coreutils';
import iconSvgStr from '../style/icon.svg';

export const fooIcon = new LabIcon({
  name: 'jupyterlab-jitsi:icon',
  svgstr: iconSvgStr
});

const SETTINGS_ID = 'jupyterlab-jitsi:plugin';

// interface IJitsiOptions {
// }

class JitsiWidget extends IFrame {
  query: string;

  constructor(options: any) {
    super();
    const queryElems = [];

    for (const k in options as any) {
      if (k === 'options') {
        const opts = options.options;
        const jopts = JSON.stringify(opts);
        queryElems.push(
          encodeURIComponent(k) + '=' + encodeURIComponent(jopts)
        );
      } else {
        queryElems.push(
          encodeURIComponent(k) + '=' + encodeURIComponent((options as any)[k])
        );
      }
    }
    this.query = queryElems.join('&');

    const baseUrl = PageConfig.getBaseUrl();
    this.url = baseUrl + `jitsi/app/index.html?${this.query}`;
    console.log('Full URL: ', this.url);

    this.id = 'Jitsi';
    this.title.label = 'Jitsi';
    this.title.closable = true;
    this.node.style.overflowY = 'auto';
    this.node.style.background = '#FFF';

    this.sandbox = [
      'allow-forms',
      'allow-modals',
      'allow-orientation-lock',
      'allow-pointer-lock',
      'allow-popups',
      'allow-presentation',
      'allow-same-origin',
      'allow-scripts',
      'allow-top-navigation',
      'allow-top-navigation-by-user-activation'
    ];
  }

  dispose(): void {
    super.dispose();
  }
  onCloseRequest(): void {
    this.dispose();
  }
}

/**
 * Initialization data for the jupyterlab-jitsi extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-jitsi:plugin',
  autoStart: true,
  requires: [ICommandPalette, ISettingRegistry],
  optional: [ILauncher],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    settings: ISettingRegistry,
    launcher: ILauncher | null
  ) => {
    let _settings: ISettingRegistry.ISettings;

    const command = 'jitsi:open';

    let registeredCommands: any[] = [];

    const _loadSettings = () => {
      const enpoints = _settings.get('configured_rooms').composite as any[];
      console.log(enpoints);
      // const enpoints = [{"name": "test"}];

      let i = 0;

      for (const c of registeredCommands) {
        c.dispose();
      }
      registeredCommands = [];

      for (const epconf of enpoints) {
        // const full_cmd = command + `:${i}`
        const full_cmd = command + `:${i}`;

        const widget = new JitsiWidget(epconf);

        const rcmd = app.commands.addCommand(full_cmd, {
          label: `Connect to VNC ${i}: ${
            'name' in epconf ? epconf['name'] : epconf['host']
          }`,
          execute: () => {
            if (!widget.isAttached) {
              // Attach the widget to the main work area if it's not there
              app.shell.add(widget, 'main');
            }
            // Activate the widget
            app.shell.activateById(widget.id);
          },
          icon: fooIcon
        });
        registeredCommands.push(rcmd);

        // Add a launcher item if the launcher is available.
        if (launcher) {
          const lcmd = launcher.add({
            command: full_cmd,
            rank: 1,
            category: 'Robotics'
          });
          registeredCommands.push(lcmd);
        }

        const pcmd = palette.addItem({
          command: full_cmd,
          category: 'Robotics'
        });
        registeredCommands.push(pcmd);

        i += 1;
      }
    };

    settings.load(SETTINGS_ID).then(setting => {
      console.log(setting);
      _settings = setting;
      const extensions = setting.get('configured_endpoints').composite as any[];
      console.log(extensions);
      _loadSettings();
      setting.changed.connect(_loadSettings);
    });

    requestAPI<any>('get_example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The jupyterlab-jitsi server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default extension;
