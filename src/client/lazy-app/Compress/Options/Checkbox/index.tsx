import { h } from 'preact';
import * as style from './style.css';
import 'add-css:./style.css';
import { UncheckedIcon, CheckedIcon } from '../../../icons';

interface Props extends preact.JSX.HTMLAttributes<HTMLInputElement> {}

export default function Checkbox(props: Props) {
  return (
    <div class={style.checkbox}>
      {props.checked ? (
        props.disabled ? (
          <CheckedIcon class={`${style.icon} ${style.disabled}`} />
        ) : (
          <CheckedIcon class={`${style.icon} ${style.checked}`} />
        )
      ) : (
        <UncheckedIcon class={style.icon} />
      )}
      <input class={style.realCheckbox} type="checkbox" {...props} />
    </div>
  );
}
