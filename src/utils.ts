export const htmlToTemplate = (_template: string): HTMLTemplateElement => {
  const template = document.createElement('template');
  template.innerHTML = _template;
  return template;
};

export const html = (strings: TemplateStringsArray, ...values: any[]) =>
  String.raw({ raw: strings }, ...values);
