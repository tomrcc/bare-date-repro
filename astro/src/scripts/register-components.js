import { registerAstroComponent } from "@cloudcannon/editable-regions/astro";
import Card from "../components/Card.astro";
import EventCard from "../components/EventCard.astro";
import PostDates from "../components/PostDates.astro";
import PostList from "../components/PostList.astro";

registerAstroComponent("card", Card);
registerAstroComponent("event-card", EventCard);
registerAstroComponent("post-list", PostList);
registerAstroComponent("post-dates", PostDates);
