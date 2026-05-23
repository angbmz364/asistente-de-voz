export const getHour = () => {
  const hour = new Date().getHours();

  if ( hour >= 5 && hour < 12 ) {
    return 'Buenos días';
  } else if ( hour >= 12 && hour < 19 ) {
    return 'Buenas tardes';
  } else {
    return 'Buenas noches';
  }

}

export const user = "Ángel"