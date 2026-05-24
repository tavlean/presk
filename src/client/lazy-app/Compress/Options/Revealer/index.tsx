import { h } from 'preact';
import * as style from './style.css';
import 'add-css:./style.css';
import { Arrow } from '../../../icons';

interface Props extends preact.JSX.HTMLAttributes<HTMLInputElement> {}

export default function Revealer(props: Props) {
  return (
    <div class={style.checkbox}>
      <input class={style.realCheckbox} type="checkbox" {...props} />
      <div class={style.arrow}>
        <Arrow />
      </div>
    </div>
  );
}
