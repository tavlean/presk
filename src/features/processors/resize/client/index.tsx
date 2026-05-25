import { Options as ResizeOptions } from '../shared/meta';
import { h, Component } from 'preact';
import linkState from 'linkstate';
import {
  inputFieldValueAsNumber,
  inputFieldValue,
  preventDefault,
  inputFieldChecked,
} from 'client/lazy-app/util';
import * as style from 'client/lazy-app/Compress/Options/style.css';
import { linkRef } from 'shared/prerendered-app/util';
import Select from 'client/lazy-app/Compress/Options/Select';
import Expander from 'client/lazy-app/Compress/Options/Expander';
import Checkbox from 'client/lazy-app/Compress/Options/Checkbox';
import {
  getMatchingResizePreset,
  getResizePresetSize,
  sizePresets,
} from './preset-state';
import { isWorkerOptions } from './runtime';
export { resize } from './runtime';

interface Props {
  isVector: boolean;
  inputWidth: number;
  inputHeight: number;
  options: ResizeOptions;
  onChange(newOptions: ResizeOptions): void;
}

interface State {
  maintainAspect: boolean;
}

export class Options extends Component<Props, State> {
  state: State = {
    maintainAspect: true,
  };

  private form?: HTMLFormElement;

  private reportOptions() {
    const form = this.form!;
    const width = form.width as HTMLInputElement;
    const height = form.height as HTMLInputElement;
    const { options } = this.props;

    if (!width.checkValidity() || !height.checkValidity()) return;

    const newOptions: ResizeOptions = {
      width: inputFieldValueAsNumber(width),
      height: inputFieldValueAsNumber(height),
      method: form.resizeMethod.value,
      premultiply: inputFieldChecked(form.premultiply, true),
      linearRGB: inputFieldChecked(form.linearRGB, true),
      // Casting, as the formfield only returns the correct values.
      fitMethod: inputFieldValue(
        form.fitMethod,
        options.fitMethod,
      ) as ResizeOptions['fitMethod'],
    };
    this.props.onChange(newOptions);
  }

  private onChange = () => {
    this.reportOptions();
  };

  private getAspect() {
    return this.props.inputWidth / this.props.inputHeight;
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!prevState.maintainAspect && this.state.maintainAspect) {
      this.form!.height.value = Math.round(
        Number(this.form!.width.value) / this.getAspect(),
      );
      this.reportOptions();
    }
  }

  private onWidthInput = () => {
    if (this.state.maintainAspect) {
      const width = inputFieldValueAsNumber(this.form!.width);
      this.form!.height.value = Math.round(width / this.getAspect());
    }

    this.reportOptions();
  };

  private onHeightInput = () => {
    if (this.state.maintainAspect) {
      const height = inputFieldValueAsNumber(this.form!.height);
      this.form!.width.value = Math.round(height * this.getAspect());
    }

    this.reportOptions();
  };

  private getPreset(): number | string {
    const { width, height } = this.props.options;
    return getMatchingResizePreset(
      { width, height },
      this.props.inputWidth,
      this.props.inputHeight,
    );
  }

  private onPresetChange = (event: Event) => {
    const select = event.target as HTMLSelectElement;
    if (select.value === 'custom') return;
    const multiplier = Number(select.value);
    const presetSize = getResizePresetSize(
      this.props.inputWidth,
      this.props.inputHeight,
      multiplier,
    );
    (this.form!.width as HTMLInputElement).value = String(presetSize.width);
    (this.form!.height as HTMLInputElement).value = String(presetSize.height);
    this.reportOptions();
  };

  render({ options, isVector }: Props, { maintainAspect }: State) {
    return (
      <form
        ref={linkRef(this, 'form')}
        class={style.optionsSection}
        onSubmit={preventDefault}
      >
        <label class={style.optionTextFirst}>
          Method:
          <Select
            name="resizeMethod"
            value={options.method}
            onChange={this.onChange}
          >
            {isVector && <option value="vector">Vector</option>}
            <option value="lanczos3">Lanczos3</option>
            <option value="mitchell">Mitchell</option>
            <option value="catrom">Catmull-Rom</option>
            <option value="triangle">Triangle (bilinear)</option>
            <option value="hqx">hqx (pixel art)</option>
            <option value="browser-pixelated">Browser pixelated</option>
            <option value="browser-low">Browser low quality</option>
            <option value="browser-medium">Browser medium quality</option>
            <option value="browser-high">Browser high quality</option>
          </Select>
        </label>
        <label class={style.optionTextFirst}>
          Preset:
          <Select value={this.getPreset()} onChange={this.onPresetChange}>
            {sizePresets.map((preset) => (
              <option value={preset}>{preset * 100}%</option>
            ))}
            <option value="custom">Custom</option>
          </Select>
        </label>
        <label class={style.optionTextFirst}>
          Width:
          <input
            required
            class={style.textField}
            name="width"
            type="number"
            min="1"
            value={'' + options.width}
            onInput={this.onWidthInput}
          />
        </label>
        <label class={style.optionTextFirst}>
          Height:
          <input
            required
            class={style.textField}
            name="height"
            type="number"
            min="1"
            value={'' + options.height}
            onInput={this.onHeightInput}
          />
        </label>
        <Expander>
          {isWorkerOptions(options) ? (
            <label class={style.optionToggle}>
              Premultiply alpha channel
              <Checkbox
                name="premultiply"
                checked={options.premultiply}
                onChange={this.onChange}
              />
            </label>
          ) : null}
          {isWorkerOptions(options) ? (
            <label class={style.optionToggle}>
              Linear RGB
              <Checkbox
                name="linearRGB"
                checked={options.linearRGB}
                onChange={this.onChange}
              />
            </label>
          ) : null}
        </Expander>
        <label class={style.optionToggle}>
          Maintain aspect ratio
          <Checkbox
            name="maintainAspect"
            checked={maintainAspect}
            onChange={linkState(this, 'maintainAspect')}
          />
        </label>
        <Expander>
          {maintainAspect ? null : (
            <label class={style.optionTextFirst}>
              Fit method:
              <Select
                name="fitMethod"
                value={options.fitMethod}
                onChange={this.onChange}
              >
                <option value="stretch">Stretch</option>
                <option value="contain">Contain</option>
              </Select>
            </label>
          )}
        </Expander>
      </form>
    );
  }
}
