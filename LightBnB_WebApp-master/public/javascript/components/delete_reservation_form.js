$(() => {
  const $deleteReservationForm = $(`
  <form action="/api/reservations" method="post" id="delete-reservation-form" class="delete-reservation-form">
    <h3 id="delete-reservation-header">Start Date</h3>
    
    <div class="delete-reservation-form__field-wrapper">
      <button>Create</button>
      <a id="reservation-form__cancel" href="#">Cancel</a>
    </div>
    <div id="datatag" class="hidden"></div>
  </form>
`);

window.$updateReservationForm = $updateReservationForm;

$updateReservationForm.on('submit', function (event) {
  let errorMessage = "";
  let startDate;
  let endDate;
  let originalStartDate = new Date($("#datatag-start-date").text());
  let originalEndDate = new Date($("#datatag-end-date").text())
  event.preventDefault();
  views_manager.show('none');
  const formArray = $(this).serializeArray();
  console.log(formArray);
  // check for presence of variables, if they're there, assign them
  if (formArray[0].value && formArray[1].value && formArray[2].value) {
    startDate = `${formArray[2].value}-${formArray[1].value}-${formArray[0].value}`
  }

  if (formArray[3].value && formArray[4].value && formArray[5].value) {
    endDate = `${formArray[5].value}-${formArray[4].value}-${formArray[3].value}`
  }

  if (!startDate && !endDate) {
    errorMessage = `Please provide either a complete start or end date.`
  }

  if (new Date(endDate) <= Date.now()) {
    errorMessage = `End date cannot be on or before today's date.`
  }

  if (new Date(startDate) < Date.now()) {
    errorMessage = `Start date cannot be before today's date.`
  }

  // end date being updated
  if (!startDate && endDate) {
    if (new Date(endDate) <= originalStartDate) {
      errorMessage = `End date cannot be on or before the original start date.`
    }
  }

  // start date being updated
  if (!endDate && startDate) {
    if (new Date(startDate) >= originalEndDate) {
      errorMessage = `Start date cannot be on or after the original end date.`
    }
  }

  // start date and end date being updated
  if (startDate && endDate) {
    if (new Date(startDate) >= new Date(endDate)) {
      errorMessage = "New start date cannot be on or after the new end date.";
    }
  }

  if ((startDate || endDate) && !errorMessage) {
    const reservationId = $(this).find("#datatag-reservation-id").text();
    const dataObj = { start_date: startDate, end_date: endDate, reservation_id: reservationId };
    updateReservation(dataObj)
    .then(data => {
      console.log(`updated reservation: ${data}`);
      views_manager.show('none');
      propertyListings.clearListings();
      getFulfilledReservations()
        .then(function(json) {
          propertyListings.addProperties(json.reservations, { upcoming: false });
          getUpcomingReservations()
          .then(json => {
            propertyListings.addProperties(json.reservations, { upcoming: true })
          })
          views_manager.show('listings');
        });
    })
    .catch(error => {
      console.error(error);
      views_manager.show('listings');
    });
  } else {
    console.log(errorMessage);
    // we can redisplay the form by pulling the information in the datatag!
    const dataObj = {
      id: $(this).find('#datatag-reservation-id').text(),
      start_date: $(this).find('#datatag-start-date').text(),
      end_date: $(this).find('#datatag-end-date').text(),
      property_id: $(this).find('#datatag-property-id').text(),
      error_message: errorMessage
    }
    views_manager.show('updateReservation', dataObj);
  }
});

$('body').on('click', '#reservation-form__cancel', function() {
  views_manager.show('listings');
  return false;
});

});