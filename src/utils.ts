/* eslint-disable @typescript-eslint/no-explicit-any */
export const htmlToTemplate = (_template: string): HTMLTemplateElement => {
  const template = document.createElement('template');
  template.innerHTML = _template;
  return template;
};

export const html = (strings: TemplateStringsArray, ...values: any[]) =>
  String.raw({ raw: strings }, ...values);

export function debugeable() {
  return function (
    _: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    let _value: any;
    let isSet: boolean = false;
    if (descriptor.set) {
      _value = descriptor.set;
      isSet = true;
    } else {
      _value = descriptor.value;
    }

    const func = function (this: any, ...props: any[]) {
      const params = props.map(() => '%o').join('\n');

      console.group(
        `%c${this.constructor.name}%c.%c${propertyKey}%c${
          isSet ? ` = ${params}` : params ? `(\n${params}\n)` : '()'
        }`,
        'color: #55B4C0',
        '',
        'color: #d96971; font-weight: bold',
        '',
        ...props
      );
      // console.group();
      const r = _value.apply(this, props);
      // console.groupEnd();
      if (!isSet) console.debug('%creturn%c %o', 'color: #ff7bc8;', '', r);

      console.groupEnd();
      return r;
    };

    if (descriptor.set) {
      descriptor.set = func;
    } else {
      descriptor.value = func;
    }
  };
}

export const createCurvature = (
  start_pos_x: number,
  start_pos_y: number,
  end_pos_x: number,
  end_pos_y: number,
  curvature: number,
  type: 'open' | 'close' | 'other' | 'openclose'
): string => {
  let hx1: number = start_pos_x;
  let hx2: number = end_pos_x;

  const extension = Math.abs(end_pos_x - start_pos_x) * curvature;

  switch (type) {
    case 'open':
      hx1 += extension;
      hx2 -= extension * (start_pos_x >= end_pos_x ? -1 : 1);
      break;
    case 'close':
      hx1 += extension * (start_pos_x >= end_pos_x ? -1 : 1);
      hx2 -= extension;
      break;
    case 'other': {
      hx1 += extension * (start_pos_x >= end_pos_x ? -1 : 1);
      hx2 -= extension * (start_pos_x >= end_pos_x ? -1 : 1);
      break;
    }
    default:
      hx1 += extension;
      hx2 -= extension;
  }

  return `M ${start_pos_x} ${start_pos_y} C ${hx1} ${start_pos_y} ${hx2} ${end_pos_y} ${end_pos_x} ${end_pos_y}`;
};
