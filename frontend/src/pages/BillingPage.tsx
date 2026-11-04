import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CheckIcon,
  CreditCardIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid';
import { useWorkspaceStore } from '@/store/workspaceStore';
import billingApi from '@/api/billing';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PricingPlan {
  id: 'free' | 'starter' | 'pro' | 'enterprise';
  name: string;
  price: string;
  period: string;
  description: string;
  popular?: boolean;
  features: string[];
}

const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individuals and small open projects getting started.',
    features: [
      'Up to 3 workspace members',
      '2 active projects',
      'Basic Kanban board',
      '100 MB file attachments',
      'Community support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$12',
    period: 'per month',
    description: 'For growing startup teams seeking rapid iteration.',
    features: [
      'Up to 10 workspace members',
      'Unlimited projects',
      'Scrum & Sprint velocity tracking',
      '5 GB file attachments',
      'Webhook integrations',
      'Standard support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: 'per month',
    popular: true,
    description: 'For scaled engineering organizations needing advanced controls.',
    features: [
      'Unlimited workspace members',
      'Unlimited projects & boards',
      'WIP limits & Custom board columns',
      'Full audit log & export',
      '50 GB file storage',
      'Priority 24/7 support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$79',
    period: 'per month',
    description: 'Dedicated enterprise infrastructure with custom security.',
    features: [
      'Dedicated tenant cluster',
      'SSO / SAML authentication',
      'Custom webhook event triggers',
      'Unlimited storage',
      'Custom SLA & dedicated engineer',
    ],
  },
];

export const BillingPage: React.FC = () => {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { currentWorkspace } = useWorkspaceStore();
  const activeSlug = currentWorkspace?.slug || workspaceSlug || 'default';

  // Subscription details
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', activeSlug],
    queryFn: () => billingApi.getSubscription(activeSlug),
    enabled: !!activeSlug,
  });

  const currentPlanId = subscription?.plan || currentWorkspace?.plan || 'free';

  // Checkout Session Mutation
  const checkoutMutation = useMutation({
    mutationFn: (plan: string) => billingApi.createCheckoutSession(activeSlug, plan),
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.success('Subscription plan selected!');
      }
    },
    onError: () => toast.error('Failed to initiate checkout session'),
  });

  // Portal Session Mutation
  const portalMutation = useMutation({
    mutationFn: () => billingApi.createPortalSession(activeSlug),
    onSuccess: (data) => {
      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
    },
    onError: () => toast.error('Failed to open billing portal'),
  });

  // Mock invoice history
  const invoices = [
    { id: 'INV-2026-003', date: '2026-10-01', amount: '$29.00', status: 'Paid', download: '#' },
    { id: 'INV-2026-002', date: '2026-09-01', amount: '$29.00', status: 'Paid', download: '#' },
    { id: 'INV-2026-001', date: '2026-08-01', amount: '$29.00', status: 'Paid', download: '#' },
  ];

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Billing & Subscription</h1>
          <p className="mt-1 text-xs text-gray-500">
            Manage your subscription tier, billing contact, and payment history.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => portalMutation.mutate()}
          isLoading={portalMutation.isPending}
          rightIcon={<ArrowTopRightOnSquareIcon className="h-4 w-4" />}
        >
          Manage Subscription
        </Button>
      </div>

      {/* Current Plan Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h3 className="text-lg font-bold text-gray-900">Current Plan:</h3>
            <span className="capitalize font-bold text-lg text-indigo-600">
              {currentPlanId} Tier
            </span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
              {subscription?.status || 'Active'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {subscription?.current_period_end
              ? `Next billing cycle renews on ${formatDate(subscription.current_period_end)}.`
              : 'Free plan with no active recurring charges.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() => {
              const el = document.getElementById('pricing-grid');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Upgrade Plan
          </Button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div id="pricing-grid" className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Available Plans</h2>
          <p className="text-xs text-gray-500">Choose the right capacity for your team scale.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId.toLowerCase() === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl bg-white p-6 border transition-all duration-200 ${
                  plan.popular
                    ? 'border-indigo-600 shadow-md ring-1 ring-indigo-600'
                    : 'border-gray-200 shadow-xs hover:border-gray-300'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                  <p className="mt-1 text-xs text-gray-500 min-h-[32px]">{plan.description}</p>

                  <div className="mt-4 flex items-baseline">
                    <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="ml-1 text-xs text-gray-500">/{plan.period}</span>
                  </div>

                  {/* Features List */}
                  <div className="mt-6 space-y-2.5">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start text-xs text-gray-600 space-x-2">
                        <CheckIcon className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100">
                  {isCurrent ? (
                    <Button variant="secondary" size="sm" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      variant={plan.popular ? 'primary' : 'outline'}
                      size="sm"
                      className="w-full"
                      isLoading={checkoutMutation.isPending}
                      onClick={() => checkoutMutation.mutate(plan.id)}
                    >
                      {plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      <Card title="Billing History" subtitle="Review past receipts and downloaded invoices">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
            <thead>
              <tr className="text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Invoice</th>
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Amount</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-2 font-mono font-medium text-gray-900">{inv.id}</td>
                  <td className="py-3 px-2 text-gray-500">{inv.date}</td>
                  <td className="py-3 px-2 font-semibold text-gray-900">{inv.amount}</td>
                  <td className="py-3 px-2">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toast.success(`Downloading ${inv.id}`)}
                      className="font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default BillingPage;
