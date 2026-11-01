// Remove only the retired sponsor records; retain all current content and media.
export function withoutSponsors(state){const s=structuredClone(state);s.sponsors=[];return s}
