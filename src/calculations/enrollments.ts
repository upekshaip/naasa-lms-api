/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export const calculateEnrollment = (
  plan: any,
  promoApplied: boolean,
  earlyBirdApplied: boolean,
) => {
  let earlyBirdDiscountAmount = 0;
  let promoDiscountAmount = 0;
  let earlyBirdNumber = null;
  let promoCodeUsed = null;

  const totalEarlyBirdCount = plan._count.classEnrollments;

  // Apply early bird discount if applicable
  const isEarlyBirdEligible: boolean =
    plan.isEarlyBirdActive && plan.earlyBirdMaxCount > totalEarlyBirdCount;

  if (earlyBirdApplied && isEarlyBirdEligible) {
    earlyBirdDiscountAmount =
      (plan.earlyBirdDiscountPercentage / 100) * plan.price;

    earlyBirdNumber = totalEarlyBirdCount + 1;
  }
  const priceAfterEarlyBird = plan.price - earlyBirdDiscountAmount;
  // Apply promo code discount if applicable
  if (promoApplied) {
    promoCodeUsed = plan.promocode;
    promoDiscountAmount =
      (plan.promoDiscountPercentage / 100) * priceAfterEarlyBird;
  }
  const purchasedAmount = priceAfterEarlyBird - promoDiscountAmount;

  return {
    price: plan.price as number,
    purchasedAmount: parseFloat(purchasedAmount.toFixed(2)),
    earlyBirdDiscountAmount: parseFloat(earlyBirdDiscountAmount.toFixed(2)),
    promoDiscountAmount: parseFloat(promoDiscountAmount.toFixed(2)),
    isEarlyBirdApplied: earlyBirdApplied && isEarlyBirdEligible,
    earlyBirdNumber: earlyBirdNumber,
    isPromoApplied: promoApplied,
    promoCodeUsed: promoCodeUsed,
  };
};

export const calculateEnrollmentDuration = (duration: number) => {
  const currentDate = new Date();
  const durationOnDays = duration;
  const expiresAt = new Date(
    currentDate.setDate(currentDate.getDate() + durationOnDays),
  );
  return expiresAt;
};
