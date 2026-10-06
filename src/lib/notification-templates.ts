export const customerNotificationTriggers = [
  "product.created",
  "product.published",
  "product.updated",
  "post.created",
  "story.created",
  "gold-rate.updated",
  "shop.updated",
] as const;

export type CustomerNotificationTrigger = (typeof customerNotificationTriggers)[number];

export type CustomerNotificationTemplate = {
  id: string;
  trigger: CustomerNotificationTrigger;
  label: string;
  title: string;
  body: string;
};

export const customerNotificationTemplates: CustomerNotificationTemplate[] = [
  { id: "product-created-01", trigger: "product.created", label: "New arrival", title: "New at {shopName}", body: "{productName} has just arrived. Tap to explore the latest design." },
  { id: "product-created-02", trigger: "product.created", label: "Fresh catalogue", title: "Fresh catalogue update", body: "{shopName} added {productName} to its jewellery collection." },
  { id: "product-created-03", trigger: "product.created", label: "Just added", title: "Just added ✨", body: "Discover {productName}, now available from {shopName}." },
  { id: "product-created-04", trigger: "product.created", label: "New design alert", title: "New design alert", body: "A beautiful new design, {productName}, is waiting for you at {shopName}." },
  { id: "product-created-05", trigger: "product.created", label: "Latest jewellery", title: "Latest jewellery from {shopName}", body: "Take a first look at {productName} in our updated catalogue." },
  { id: "product-created-06", trigger: "product.created", label: "Collection refreshed", title: "Our collection just grew", body: "{shopName} has added {productName}. See the details now." },
  { id: "product-created-07", trigger: "product.created", label: "Something special", title: "Something special is here", body: "Meet {productName}, the newest addition at {shopName}." },
  { id: "product-created-08", trigger: "product.created", label: "Be the first", title: "Be the first to see it", body: "{productName} is newly listed in the {shopName} catalogue." },
  { id: "product-created-09", trigger: "product.created", label: "New sparkle", title: "A new sparkle has arrived", body: "Explore {productName} and more fresh designs from {shopName}." },
  { id: "product-created-10", trigger: "product.created", label: "Catalogue addition", title: "New catalogue addition", body: "{shopName} has introduced {productName}. Tap to view photos and details." },

  { id: "product-published-01", trigger: "product.published", label: "Now live", title: "Now live at {shopName}", body: "{productName} is now available to view in our digital store." },
  { id: "product-published-02", trigger: "product.published", label: "Catalogue live", title: "A new design is live", body: "Open the {shopName} catalogue to discover {productName}." },
  { id: "product-published-03", trigger: "product.published", label: "Ready to explore", title: "Ready for you to explore", body: "{productName} is now live with photos and complete details." },
  { id: "product-published-04", trigger: "product.published", label: "Published today", title: "Published today ✨", body: "See the newly published {productName} from {shopName}." },
  { id: "product-published-05", trigger: "product.published", label: "First look", title: "Your first look is here", body: "{shopName} has published {productName}. Tap to see it now." },
  { id: "product-published-06", trigger: "product.published", label: "New showcase", title: "New jewellery showcase", body: "{productName} is now featured in the {shopName} digital catalogue." },
  { id: "product-published-07", trigger: "product.published", label: "Discover now", title: "Discover our latest design", body: "{productName} is live at {shopName}. Explore it before your next visit." },
  { id: "product-published-08", trigger: "product.published", label: "Catalogue reveal", title: "New catalogue reveal", body: "We have revealed {productName}. Open {shopName} to view the collection." },

  { id: "product-updated-01", trigger: "product.updated", label: "Photos updated", title: "New photos at {shopName}", body: "We updated {productName} with fresh photos and details." },
  { id: "product-updated-02", trigger: "product.updated", label: "Details refreshed", title: "Catalogue details refreshed", body: "Take another look at the updated {productName} from {shopName}." },
  { id: "product-updated-03", trigger: "product.updated", label: "Better view", title: "See this design more clearly", body: "{productName} now has updated photos in the {shopName} catalogue." },
  { id: "product-updated-04", trigger: "product.updated", label: "Catalogue update", title: "Catalogue update from {shopName}", body: "Information for {productName} has just been refreshed." },
  { id: "product-updated-05", trigger: "product.updated", label: "Design refreshed", title: "A design was refreshed", body: "Open {productName} to see the latest photos and information." },
  { id: "product-updated-06", trigger: "product.updated", label: "Latest information", title: "Latest product information", body: "{shopName} has updated {productName} for you." },
  { id: "product-updated-07", trigger: "product.updated", label: "Look again", title: "Worth another look", body: "Something changed on {productName}. Tap to see the latest version." },

  { id: "post-created-01", trigger: "post.created", label: "New photo", title: "New photo from {shopName}", body: "A fresh jewellery photo has been added. Tap to take a look." },
  { id: "post-created-02", trigger: "post.created", label: "Fresh inspiration", title: "Fresh jewellery inspiration", body: "{shopName} shared a new catalogue photo for you." },
  { id: "post-created-03", trigger: "post.created", label: "New showcase", title: "New showcase from {shopName}", body: "See the newest jewellery photo in our digital storefront." },
  { id: "post-created-04", trigger: "post.created", label: "Photo update", title: "Our photo catalogue was updated", body: "Open {shopName} to explore the latest visual update." },
  { id: "post-created-05", trigger: "post.created", label: "Latest post", title: "Latest from {shopName}", body: "We have shared a new jewellery post. Tap to view it." },
  { id: "post-created-06", trigger: "post.created", label: "Style update", title: "A new style update is here", body: "Discover the latest jewellery inspiration from {shopName}." },
  { id: "post-created-07", trigger: "post.created", label: "See what is new", title: "See what is new", body: "{shopName} just posted a fresh catalogue update." },

  { id: "story-created-01", trigger: "story.created", label: "New story", title: "New story from {shopName}", body: "A new jewellery story is live. Watch it before it disappears." },
  { id: "story-created-02", trigger: "story.created", label: "Behind the scenes", title: "See what is happening at {shopName}", body: "Our latest story gives you a closer look at the collection." },
  { id: "story-created-03", trigger: "story.created", label: "Quick update", title: "A quick update for you", body: "{shopName} has shared a new story. Tap to watch." },
  { id: "story-created-04", trigger: "story.created", label: "Story live", title: "Our latest story is live", body: "Open {shopName} for a fresh jewellery update." },
  { id: "story-created-05", trigger: "story.created", label: "Do not miss", title: "Do not miss this story", body: "A limited-time story from {shopName} is waiting for you." },
  { id: "story-created-06", trigger: "story.created", label: "New glimpse", title: "A new glimpse from {shopName}", body: "Watch our newest jewellery story now." },

  { id: "gold-rate-01", trigger: "gold-rate.updated", label: "Rates updated", title: "Today's gold rates are updated", body: "Check the latest 22K and 24K rates from {shopName}." },
  { id: "gold-rate-02", trigger: "gold-rate.updated", label: "Gold rate alert", title: "Gold rate alert from {shopName}", body: "Today's gold prices are now available in our digital store." },
  { id: "gold-rate-03", trigger: "gold-rate.updated", label: "Today's rates", title: "View today's gold rates", body: "{shopName} has refreshed today's live gold-rate banner." },
  { id: "gold-rate-04", trigger: "gold-rate.updated", label: "Price update", title: "Latest gold price update", body: "Tap to see the current gold rates published by {shopName}." },
  { id: "gold-rate-05", trigger: "gold-rate.updated", label: "Rates are live", title: "Today's rates are live", body: "Open {shopName} to check the newly updated gold prices." },
  { id: "gold-rate-06", trigger: "gold-rate.updated", label: "Daily gold update", title: "Your daily gold update", body: "The latest gold rates from {shopName} are ready to view." },

  { id: "shop-updated-01", trigger: "shop.updated", label: "Store refreshed", title: "{shopName} has been refreshed", body: "Visit our updated digital storefront and explore what is new." },
  { id: "shop-updated-02", trigger: "shop.updated", label: "New look", title: "A fresh new look", body: "{shopName} updated its store photos and information." },
  { id: "shop-updated-03", trigger: "shop.updated", label: "Store update", title: "Store update from {shopName}", body: "Our digital storefront has new information for you." },
  { id: "shop-updated-04", trigger: "shop.updated", label: "Banner updated", title: "See our new store banner", body: "Open {shopName} to view our latest storefront update." },
  { id: "shop-updated-05", trigger: "shop.updated", label: "Visit again", title: "Visit {shopName} again", body: "We have improved our digital store with a fresh update." },
  { id: "shop-updated-06", trigger: "shop.updated", label: "Something changed", title: "Something new at {shopName}", body: "Our storefront was just updated. Tap to discover the changes." },
];

export const triggerLabels: Record<CustomerNotificationTrigger, string> = {
  "product.created": "New product created",
  "product.published": "Draft product published",
  "product.updated": "Product photos/details updated",
  "post.created": "New catalogue photo/post",
  "story.created": "New story",
  "gold-rate.updated": "Gold rate updated",
  "shop.updated": "Store banner/details updated",
};

export function templatesForTrigger(trigger: CustomerNotificationTrigger) {
  return customerNotificationTemplates.filter((template) => template.trigger === trigger);
}

export function defaultTemplateForTrigger(trigger: CustomerNotificationTrigger) {
  const template = templatesForTrigger(trigger)[0];
  if (!template) throw new Error(`Missing notification template for ${trigger}`);
  return template;
}

export function renderNotificationText(
  text: string,
  values: { shopName: string; productName?: string },
) {
  return text
    .replaceAll("{shopName}", values.shopName)
    .replaceAll("{productName}", values.productName || "our newest design");
}

