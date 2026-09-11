import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_theme.dart';
import '../../models/event_model.dart';
import '../../models/service_model.dart';
import '../../services/auth_service.dart';
import '../../services/event_service.dart';
import '../../services/service_service.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_view.dart';
import '../../widgets/event_card.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/service_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final EventService _eventService = EventService();
  final ServiceService _serviceService = ServiceService();
  final _searchController = TextEditingController();

  List<EventModel> _events = [];
  List<ServiceModel> _services = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedCategory = 'All';

  final List<Map<String, dynamic>> _categories = [
    {'name': 'All', 'icon': Icons.grid_view_rounded},
    {'name': 'Music', 'icon': Icons.music_note_rounded},
    {'name': 'Wedding', 'icon': Icons.favorite_rounded},
    {'name': 'Corporate', 'icon': Icons.business_center_rounded},
    {'name': 'Birthday', 'icon': Icons.cake_rounded},
    {'name': 'Catering', 'icon': Icons.restaurant_rounded},
    {'name': 'Photography', 'icon': Icons.camera_alt_rounded},
  ];

  @override
  void initState() {
    super.initState();
    _loadHomeData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadHomeData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final eventsFuture = _eventService.getEvents(
        category: _selectedCategory,
        search: _searchController.text,
      );
      final servicesFuture = _serviceService.getServices(
        category: _selectedCategory,
        search: _searchController.text,
      );

      final results = await Future.wait([eventsFuture, servicesFuture]);

      if (mounted) {
        setState(() {
          _events = results[0] as List<EventModel>;
          _services = results[1] as List<ServiceModel>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;

    return Scaffold(
      appBar: const CustomerAppBar(title: 'JoyEvents'),
      body: RefreshIndicator(
        onRefresh: _loadHomeData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User Greeting & Wallet Quick Shortcut
              Container(
                width: double.infinity,
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primaryColor, AppTheme.accentColor],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryColor.withOpacity(0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hello, ${user?.name ?? "Customer"}! 👋',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Plan your next big event today',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    InkWell(
                      onTap: () => context.push('/customer/wallet'),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            const Text(
                              'Wallet',
                              style: TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '₹${user?.walletBalance.toStringAsFixed(0) ?? "0"}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Search Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: TextField(
                  controller: _searchController,
                  onSubmitted: (_) => _loadHomeData(),
                  decoration: InputDecoration(
                    hintText: 'Search events, services, venues...',
                    prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.subtitleColor),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _loadHomeData();
                            },
                          )
                        : IconButton(
                            icon: const Icon(Icons.tune_rounded, color: AppTheme.primaryColor),
                            onPressed: () => context.push('/customer/events'),
                          ),
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Categories Row
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16.0),
                child: Text(
                  'Categories',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textColor,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 42,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _categories.length,
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    final isSelected = _selectedCategory == cat['name'];
                    return Container(
                      margin: const EdgeInsets.only(right: 10),
                      child: FilterChip(
                        selected: isSelected,
                        label: Row(
                          children: [
                            Icon(
                              cat['icon'] as IconData,
                              size: 16,
                              color: isSelected ? Colors.white : AppTheme.subtitleColor,
                            ),
                            const SizedBox(width: 6),
                            Text(cat['name'] as String),
                          ],
                        ),
                        selectedColor: AppTheme.primaryColor,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : AppTheme.textColor,
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        ),
                        onSelected: (_) {
                          setState(() {
                            _selectedCategory = cat['name'] as String;
                          });
                          _loadHomeData();
                        },
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 24),

              if (_isLoading)
                const SizedBox(height: 200, child: LoadingView(message: 'Loading events & services...'))
              else if (_errorMessage != null)
                ErrorView(message: _errorMessage!, onRetry: _loadHomeData)
              else ...[
                // Featured Events Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Upcoming Events',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textColor,
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.push('/customer/events'),
                        child: const Text('See All'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                if (_events.isEmpty)
                  const EmptyState(
                    title: 'No Events Found',
                    message: 'No events matching your selected criteria.',
                    icon: Icons.event_busy_outlined,
                  )
                else
                  SizedBox(
                    height: 305,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _events.length,
                      itemBuilder: (context, index) {
                        final event = _events[index];
                        return SizedBox(
                          width: 220,
                          child: Padding(
                            padding: const EdgeInsets.only(right: 14),
                            child: EventCard(
                              event: event,
                              onTap: () => context.push(
                                '/customer/event-details/${event.id}',
                                extra: event,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                const SizedBox(height: 28),

                // Popular Services Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Popular Services',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textColor,
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.push('/customer/services'),
                        child: const Text('See All'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                if (_services.isEmpty)
                  const EmptyState(
                    title: 'No Services Found',
                    message: 'No services available at the moment.',
                    icon: Icons.miscellaneous_services_outlined,
                  )
                else
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.74,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),

                    itemCount: _services.length > 4 ? 4 : _services.length,
                    itemBuilder: (context, index) {
                      final service = _services[index];
                      return ServiceCard(
                        service: service,
                        onTap: () => context.push(
                          '/customer/service-details/${service.id}',
                          extra: service,
                        ),
                      );
                    },
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
