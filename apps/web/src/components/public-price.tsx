import type {PriceSummary} from '@dorob/core';
import {persianNumber} from '@/lib/persian-format';

export function PublicPrice({ price,inline=false }: { price:PriceSummary;inline?:boolean }) {
  const Container=inline?'span':'div';
  const Original=inline?'span':'div';
  return <Container className="discovery-price catalog-price">
    {price.originalAmount !== null && <Original><del>{persianNumber(price.originalAmount)} تومان</del></Original>}
    <strong>{price.status === 'free' ? 'رایگان' : price.status === 'unknown' ? 'قیمت نامشخص' : <>{price.startingPrice && 'از '}{price.status === 'subscription' && 'اشتراک؛ '}{price.amount !== null ? <>{persianNumber(price.amount)} <small>تومان</small></> : 'مبلغ نامشخص'}</>}</strong>
    {price.status === 'subscription' && <small>{price.billingPeriod === 'monthly' ? 'ماهانه' : price.billingPeriod === 'yearly' ? 'سالانه' : price.billingPeriod === 'other' ? 'دورهٔ پرداخت دیگر' : 'دورهٔ پرداخت نامشخص'}</small>}
  </Container>;
}
