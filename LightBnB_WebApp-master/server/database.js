const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool(({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
}));


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const queryString = `
  SELECT *
  FROM users
  WHERE email = $1;
  `;
  const values = [email];

  return pool
    .query(queryString, values)
    .then(res => {
      if (!res.rows.length) return null;
      return res.rows[0];
    })
    .catch(err => console.log(err.message));
  
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  const queryString = `
  SELECT *
  FROM users
  WHERE id = $1;
  `;
  const values = [id];

  return pool
    .query(queryString, values)
    .then(res => {
      if (!res.rows.length) return null;
      return res.rows[0];
    })
    .catch(err => console.log(err.message));

}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;
  `;
  const values = [user.name, user.email, user.password];

  return pool
    .query(queryString, values)
    .then(res => {
      return res.rows[0];
    })
    .catch(err => console.log(err.message));

}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getFulfilledReservations = function(guest_id, limit = 10) {
  const queryString = `
  SELECT properties.*, reservations.*, AVG(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON properties.id = reservations.property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  AND reservations.start_date <= now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;
  `;
  const values = [guest_id, limit];

  return pool
    .query(queryString, values)
    .then(res => {
      return res.rows;
    })
    .catch(err => console.log(err.message));
}
exports.getFulfilledReservations = getFulfilledReservations;

const getUpcomingReservations = function(guest_id, limit = 10) {
  const queryString = `
  SELECT properties.*, reservations.*, AVG(property_reviews.rating) as average_rating
  FROM properties
  JOIN reservations ON properties.id = reservations.property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  AND reservations.start_date > now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;
  `;
  const values = [guest_id, limit];

  return pool
    .query(queryString, values)
    .then(res => res.rows)
    .catch(err => console.log(err.message));

};
exports.getUpcomingReservations = getUpcomingReservations;

const updateReservation = function(reservationData) {
  let queryString = `UPDATE reservations SET `;
  const queryParams = [];
  if (reservationData.start_date) {
    queryParams.push(reservationData.start_date);
    queryString += `start_date = $1`;
    if (reservationData.end_date) {
      queryParams.push(reservationData.end_date);
      queryString += `, end_date = $2`;
    }
  } else {
    queryParams.push(reservationData.end_date);
    queryString += `end_date = $1`;
  }
  queryString += ` WHERE id = $${queryParams.length + 1} RETURNING *;`
  queryParams.push(reservationData.reservation_id);
  console.log(queryString);
  return pool.query(queryString, queryParams)
    .then(res => res.rows[0])
    .catch(err => console.error(err));

};
exports.updateReservation = updateReservation;

const deleteReservation = function(reservation_id) {
  const queryString = `
  DELETE FROM reservations
  WHERE id = $1;
  `;
  const values = [reservation_id]

  return pool
    .query(queryString, values)
    .then(() => {
      console.log("Successfully deleted!")
    })
    .catch(err => console.log(err.message));

};
exports.deleteReservation = deleteReservation;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  const queryParams = [];

  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_reviews.property_id
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    const length = queryParams.length;
    const queryAdd = `WHERE properties.city LIKE $${length}`;
    queryString += queryAdd;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    const length = queryParams.length;
    const queryAdd = (length === 1) ? `WHERE properties.owner_id = $${length}` : ` AND properties.owner_id = $${length}`;
    queryString += queryAdd;
  }

  const minPrice = options.minimum_price_per_night * 100;
  const maxPrice = options.maximum_price_per_night * 100;
  if (minPrice && maxPrice) {
    queryParams.push(minPrice);
    const lengthOne = queryParams.length;
    queryParams.push(maxPrice);
    const lengthTwo = queryParams.length;
    const queryAdd = (lengthOne === 1) ? `WHERE properties.cost_per_night BETWEEN $${lengthOne} AND $${lengthTwo}` : ` AND properties.cost_per_night BETWEEN $${lengthOne} AND $${lengthTwo}`;
    queryString += queryAdd;
  }
  if (minPrice && !maxPrice) {
    queryParams.push(minPrice);
    const length = queryParams.length;
    const queryAdd = (length === 1) ? `WHERE properties.cost_per_night >= $${length}` : ` AND properties.cost_per_night >= $${length}`;
    queryString += queryAdd;
  }
  if (!minPrice && maxPrice) {
    queryParams.push(maxPrice);
    const length = queryParams.length;
    const queryAdd = (length === 1) ? `WHERE properties.cost_per_night <= $${length}` : ` AND properties.cost_per_night <= $${length}`;
    queryString += queryAdd;
  }

  queryString += `
  GROUP BY properties.id
  `;

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    const length = queryParams.length;
    const queryAdd = `HAVING AVG(property_reviews.rating) >= $${length}`;
    queryString += queryAdd;
  }

  queryParams.push(limit);
  const length = queryParams.length;
  queryString += `
  ORDER BY properties.cost_per_night
  LIMIT $${length};
  `; 

  return pool
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => console.log(err.message));

};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `;
  const values = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms
  ];

  return pool
    .query(queryString, values)
    .then(res => res.rows[0])
    .catch(err => console.log(err.message));

}
exports.addProperty = addProperty;


const addReservation = function(reservation) {
  const queryString = `
  INSERT INTO reservations (start_date, end_date, property_id, guest_id)
  VALUES ($1, $2, $3, $4)
  RETURNING *;
  `;
  const values = [reservation.start_date, reservation.end_date, reservation.property_id, reservation.guest_id];

  return pool
    .query(queryString, values)
    .then(res => res.rows[0])
    .catch(err => console.log(err.message));

};

exports.addReservation = addReservation;

const getIndividualReservation = function(reservationId) {
  const queryString = `SELECT * FROM reservations WHERE reservations.id = $1`;
  const values = [reservationId];
  return pool
    .query(queryString, values)
    .then(res => res.rows[0])
    .catch(err => console.log(err.message));
}

exports.getIndividualReservation = getIndividualReservation;