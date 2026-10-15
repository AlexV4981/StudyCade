import {MathfieldElement} from '/vendor/mathlive/mathlive.min.mjs';

MathfieldElement.fontsDirectory = '/vendor/mathlive/fonts';
MathfieldElement.soundsDirectory = null;
const field = new MathfieldElement();
field.id = 'math-field';
field.setAttribute('aria-label', 'Equation');
document.getElementById('math-field-slot').append(field);
document.getElementById('math-open').disabled = false;
