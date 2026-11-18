from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('workspace', 'plan', 'status', 'stripe_customer_id', 'current_period_end', 'cancel_at_period_end')
    list_filter = ('plan', 'status', 'cancel_at_period_end')
    search_fields = ('workspace__name', 'stripe_customer_id', 'stripe_subscription_id')
    raw_id_fields = ('workspace',)
