import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { QuoteInput } from "./validation";

export type ItineraryDay = {
  dayNumber: number;
  dateLabel: string;
  city: string;
  title: string;
  highlights: string[];
};

export type Itinerary = {
  days: ItineraryDay[];
};

export function buildItinerary(input: QuoteInput): Itinerary {
  const arrival = parseISO(input.arrivalDate);
  const departure = parseISO(input.departureDate);
  const diffDays = differenceInCalendarDays(departure, arrival);
  const daysCount = Math.max(1, diffDays + 1);

  const hasAyodhya = input.destinations.includes("ayodhya");
  const hasPrayagraj = input.destinations.includes("prayagraj");
  const hasVindhyachal = input.destinations.includes("vindhyachal");

  const days: ItineraryDay[] = [];

  function pushVaranasiDay(index: number, label: string, highlights: string[]) {
    const d = new Date(arrival);
    d.setDate(d.getDate() + index);
    days.push({
      dayNumber: index + 1,
      dateLabel: format(d, "dd MMM yyyy"),
      city: "Varanasi",
      title: label,
      highlights,
    });
  }

  function pushCityExcursion(index: number, city: string, label: string, highlights: string[]) {
    const d = new Date(arrival);
    d.setDate(d.getDate() + index);
    days.push({
      dayNumber: index + 1,
      dateLabel: format(d, "dd MMM yyyy"),
      city,
      title: label,
      highlights,
    });
  }

  if (!hasAyodhya && !hasPrayagraj && !hasVindhyachal) {
    // Varanasi-only templates (more detailed)
    for (let i = 0; i < daysCount; i++) {
      if (i === 0) {
        pushVaranasiDay(i, "Arrival & Ganga aarti", [
          "Arrival in Varanasi and transfer to hotel near the ghats / main city.",
          "Easy orientation walk to nearby ghats such as Assi, Dashashwamedh or Rajendra Prasad ghat.",
          "Experience the grand Ganga aarti at Dashashwamedh ghat with illuminated diyas and chanting.",
          "Optional: chai at a riverside stall and a short walk through Godowlia market.",
        ]);
      } else if (i === 1) {
        pushVaranasiDay(i, "Kashi Vishwanath corridor, lanes & mandir circuit", [
          "Darshan at Kashi Vishwanath temple and exploration of the Kashi Vishwanath corridor.",
          "Walk through old city lanes covering Vishwanath Gali, Annapurna Mandir, and Nepali (Kathwala) temple.",
          "Visit key ghats such as Manikarnika, Harishchandra, Assi and Tulsi ghat for photo stops.",
          "Explore local sweet shops and famous chaat joints / lassi outlets in the old city.",
          "Optional: visit to Bharat Mata mandir or Durga Kund (Monkey temple) depending on time and interest.",
        ]);
      } else if (i === 2) {
        pushVaranasiDay(i, "Sunrise boat ride, Sarnath & heritage sights", [
          "Early morning boat ride on the Ganga to witness sunrise and morning rituals at the ghats.",
          "Visit to Sarnath covering Dhamek stupa, Mulagandha Kuti Vihar, Ashoka pillar site and the archaeological museum.",
          "Stop at Chaukhandi stupa and nearby viewpoints (time permitting).",
          "Return to Varanasi for free time at cafés, handicraft shops and silk sari showrooms.",
          "Optional: second visit to the ghats in the evening for a quieter aarti or photo walk.",
        ]);
      } else {
        pushVaranasiDay(i, "Extended Varanasi experiences", [
          "Visit lesser-known temples such as Sankat Mochan Hanuman Mandir and Tulsi Manas Mandir.",
          "Explore BHU campus (Bharat Kala Bhavan museum) and New Vishwanath temple complex.",
          "Free time for shopping Banarasi silk sarees, wooden toys, and brassware.",
          "Optional: food trail with kachori-sabzi, malaiyyo (seasonal), rabri and other local specialties.",
        ]);
      }
    }
  } else {
    // Multi-city simple assignment of excursion days
    let dayIndex = 0;

    // Day 1 always Varanasi arrival
    pushVaranasiDay(dayIndex, "Arrival & Ganga aarti in Varanasi", [
      "Arrival in Varanasi and hotel check-in",
      "Evening Ganga aarti at Dashashwamedh ghat",
    ]);
    dayIndex++;

    if (hasAyodhya && dayIndex < daysCount) {
      pushCityExcursion(dayIndex, "Ayodhya", "Ayodhya darshan (same-day from Varanasi)", [
        "Early morning private vehicle drive from Varanasi to Ayodhya.",
        "Darshan at Sri Ram Janmabhoomi temple complex and nearby shrines linked to the Ramayana.",
        "Visit Hanuman Garhi, Kanak Bhawan and other prominent Ayodhya temples as per available time.",
        "Walk through the old city lanes and ghats of Ayodhya with time for prasad / shopping.",
        "Return drive to Varanasi in the evening / night with rest stops on the way.",
      ]);
      dayIndex++;
    }

    if (hasPrayagraj && dayIndex < daysCount) {
      pushCityExcursion(dayIndex, "Prayagraj", "Prayagraj Triveni sangam visit", [
        "Drive from Varanasi to Prayagraj by private vehicle.",
        "Boat ride at Triveni Sangam (confluence of Ganga, Yamuna and the mythical Saraswati).",
        "Visit to key temples around the Sangam area (e.g., Bade Hanumanji temple).",
        "Explore Anand Bhavan (Nehru family home) and surrounding heritage area, time permitting.",
        "Return journey towards Varanasi / onward night halt as per trip plan.",
      ]);
      dayIndex++;
    }

    if (hasVindhyachal && dayIndex < daysCount) {
      pushCityExcursion(dayIndex, "Vindhyachal", "Vindhyachal Devi darshan", [
        "Drive from Varanasi to Vindhyachal, a major Shaktipeeth on the banks of the Ganga.",
        "Darshan at Vindhyavasini Devi temple with time for proper queue / rituals.",
        "Optional visit to nearby temples such as Ashtabhuja Devi and Kali Khoh (subject to time and interest).",
        "Short walk through local bazaar for prasad and religious items.",
        "Return drive towards Varanasi with scenic river and countryside views.",
      ]);
      dayIndex++;
    }

    while (dayIndex < daysCount) {
      pushVaranasiDay(dayIndex, "Leisure / buffer day", [
        "Flexi day kept as a buffer for rest, shopping or revisiting favourite ghats/temples.",
        "Option to add more experiences such as photography sessions, food walks or café time by the ghats.",
      ]);
      dayIndex++;
    }
  }

  return { days };
}

