import { h, Component } from 'preact';
import type { ComponentConstructor } from 'preact';
import * as style from 'client/lazy-app/Compress/Options/style.css';
import Range from 'client/lazy-app/Compress/Options/Range';

interface EncodeOptions {
  quality: number;
}

export interface QualityOptionsProps {
  options: EncodeOptions;
  onChange(newOptions: EncodeOptions): void;
}

interface QualityOptionArg {
  min?: number;
  max?: number;
  step?: number;
}

export function qualityOption(
  opts: QualityOptionArg = {},
): ComponentConstructor<QualityOptionsProps, {}> {
  const { min = 0, max = 100, step = 1 } = opts;

  class QualityOptions extends Component<QualityOptionsProps, {}> {
    onChange = (event: Event) => {
      const el = event.currentTarget as HTMLInputElement;
      this.props.onChange({ quality: Number(el.value) });
    };

    render({ options }: QualityOptionsProps) {
      return (
        <div class={style.optionsSection}>
          <div class={style.optionOneCell}>
            <Range
              name="quality"
              min={min}
              max={max}
              step={step || 'any'}
              value={options.quality}
              onInput={this.onChange}
            >
              Quality:
            </Range>
          </div>
        </div>
      );
    }
  }

  return QualityOptions;
}
