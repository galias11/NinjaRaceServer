const validateMail = email => {
  let valid = true;
  const firstSeparation = email.split('@');
  valid = firstSeparation.length === 2;
  if(!valid){
    return false;
  }
  const secondSeparation = firstSeparation[1].split('.');
  valid = secondSeparation.length >= 2;
  return valid;
}

const validatePword = pword => {
  let valid = pword.length >= 8;
  return valid;
}

module.exports = {
  validateMail,
  validatePword
}
