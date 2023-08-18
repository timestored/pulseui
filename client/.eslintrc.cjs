/* eslint-env node */
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  "parserOptions": {
    "ecmaVersion": 2020,
    "project": ["tsconfig.json"] ,
    "sourceType": "module"
  },
  plugins: ['@typescript-eslint',"react", "react-hooks", "import"],
  "ignorePatterns": ["src/echarts-for-react/*","__mocks__/*"],
  "rules": {
    // '@typescript-eslint/strict-boolean-expressions':[ 2, { 
    //   allowString: true,
    //   allowNumber: false,
    //   allowNullableObject: true,
    //   allowNullableBoolean: true,
    //   allowNullableString: true,
    //   allowNullableNumber: false,
    //   allowNullableEnum: true,
    //   allowAny: true,
    //   allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: true,
    // }],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "react-hooks/exhaustive-deps": "off",
    // Remove BELOW HERE ASAP!
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-types": "off",
    "no-inner-declarations": "off",
    "@typescript-eslint/adjacent-overload-signatures": "off",
    "@typescript-eslint/no-var-requires": "off",
  },  
  root: true,
};