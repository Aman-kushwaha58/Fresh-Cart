-- FreshCart Automatic Profile Trigger & Atomic Checkout Function for Supabase

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic transactional order placement RPC (server-calculated prices & stock lock)
CREATE OR REPLACE FUNCTION public.place_grocery_order(
  p_shipping JSONB,
  p_payment_method TEXT DEFAULT 'cash_on_delivery',
  p_delivery_instructions TEXT DEFAULT '',
  p_promo_code TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_subtotal NUMERIC(10,2) := 0;
  v_delivery NUMERIC(10,2) := 0;
  v_discount NUMERIC(10,2) := 0;
  v_total NUMERIC(10,2) := 0;
  v_order_id BIGINT;
  v_item RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  FOR v_item IN
    SELECT c.product_id, c.quantity, p.name, p.image_url, p.price, p.stock
    FROM public.cart_items c
    JOIN public.products p ON p.id = c.product_id
    WHERE c.user_id = v_user_id
    FOR UPDATE OF p
  LOOP
    IF v_item.stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_item.name;
    END IF;
    v_subtotal := v_subtotal + (v_item.price * v_item.quantity);
  END LOOP;

  IF v_subtotal = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  v_delivery := CASE WHEN v_subtotal >= 35 THEN 0 ELSE 4.99 END;
  IF UPPER(COALESCE(p_promo_code, '')) = 'FRESH10' THEN
    v_discount := LEAST(ROUND(v_subtotal * 0.10, 2), 15.00);
  END IF;
  v_total := GREATEST(0, v_subtotal + v_delivery - v_discount);

  INSERT INTO public.orders (
    order_number, user_id, shipping_snapshot, subtotal, delivery_fee, discount, total_amount,
    payment_method, payment_status, order_status, delivery_instructions
  ) VALUES (
    'FC-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(substr(md5(random()::text), 1, 6)),
    v_user_id, p_shipping, v_subtotal, v_delivery, v_discount, v_total,
    p_payment_method, 'pending', 'pending', p_delivery_instructions
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal)
  SELECT v_order_id, c.product_id, p.name, p.image_url, p.price, c.quantity, (p.price * c.quantity)
  FROM public.cart_items c
  JOIN public.products p ON p.id = c.product_id
  WHERE c.user_id = v_user_id;

  UPDATE public.products p
  SET stock = p.stock - c.quantity,
      sales_count = p.sales_count + c.quantity
  FROM public.cart_items c
  WHERE c.user_id = v_user_id AND c.product_id = p.id;

  DELETE FROM public.cart_items WHERE user_id = v_user_id;

  RETURN v_order_id;
END;
$$;
