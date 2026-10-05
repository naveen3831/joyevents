import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_theme.dart';
import '../../models/event_model.dart';
import '../../models/service_model.dart';
import '../../services/auth_service.dart';
import '../../services/cart_service.dart';
import '../../services/event_service.dart';
import '../../services/service_service.dart';
import '../../services/merchant_service.dart';
import '../../widgets/category_image_card.dart';
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

  List<Map<String, dynamic>> _categories = [
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
    _fetchCategories();
    _loadHomeData();
  }

  Future<void> _fetchCategories() async {
    try {
      final rawCats = await MerchantService().getCategories();
      if (rawCats.isNotEmpty && mounted) {
        final List<Map<String, dynamic>> loaded = [
          {'name': 'All', 'icon': Icons.grid_view_rounded}
        ];
        for (var c in rawCats) {
          if (c is Map && c.containsKey('name')) {
            final name = c['name'].toString();
            if (name.toLowerCase() != 'all') {
              loaded.add({
                'name': name,
                'imageUrl': c['imageUrl']?.toString(),
              });
            }
          }
        }
        setState(() {
          _categories = loaded;
        });
      }
    } catch (_) {}
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
    final cartService = CartService();
    final topPadding = MediaQuery.of(context).padding.top;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        body: RefreshIndicator(
          onRefresh: _loadHomeData,
          edgeOffset: topPadding + 200,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ═══════════════════════════════════════════
                // INTEGRATED GRADIENT HERO
                // ═══════════════════════════════════════════
                _HeroSection(
                  topPadding: topPadding,
                  userName: user?.name ?? 'Customer',
                  cartService: cartService,
                  onCartPressed: () => context.push('/customer/cart'),
                  onNotificationsPressed: () =>
                      context.push('/customer/notifications'),
                ),

                // ═══════════════════════════════════════════
                // SEARCH BAR
                // ═══════════════════════════════════════════
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 22, 20, 0),
                  child: TextField(
                    controller: _searchController,
                    onSubmitted: (_) => _loadHomeData(),
                    decoration: InputDecoration(
                      hintText: 'Search events, services, venues...',
                      prefixIcon: const Icon(Icons.search_rounded,
                          color: AppTheme.subtitleColor),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                _loadHomeData();
                              },
                            )
                          : IconButton(
                              icon: const Icon(Icons.tune_rounded,
                                  color: AppTheme.primaryColor),
                              onPressed: () =>
                                  context.push('/customer/events'),
                            ),
                    ),
                  ),
                ),

                const SizedBox(height: 22),

                // ═══════════════════════════════════════════
                // CATEGORIES
                // ═══════════════════════════════════════════
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20.0),
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
                  height: 94,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: _categories.length,
                    itemBuilder: (context, index) {
                      final catItem = _categories[index];
                      final catName = catItem['name'] as String;
                      final catImageUrl = catItem['imageUrl'] as String?;
                      final isSelected = _selectedCategory.toLowerCase() == catName.toLowerCase();
                      return CategoryImageCard(
                        title: catName,
                        imageUrl: catImageUrl,
                        isSelected: isSelected,
                        width: 100,
                        height: 90,
                        allLabel: 'All',
                        onTap: () {
                          if (!isSelected) {
                            setState(() {
                              _selectedCategory = catName;
                            });
                            _loadHomeData();
                          }
                        },
                      );
                    },
                  ),
                ),

                const SizedBox(height: 24),

                // ═══════════════════════════════════════════
                // CONTENT: Events & Services
                // ═══════════════════════════════════════════
                if (_isLoading)
                  const SizedBox(
                      height: 200,
                      child: LoadingView(
                          message: 'Loading events & services...'))
                else if (_errorMessage != null)
                  ErrorView(
                      message: _errorMessage!, onRetry: _loadHomeData)
                else ...[
                  // Upcoming Events
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0),
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
                          onPressed: () =>
                              context.push('/customer/events'),
                          child: const Text('See All'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),

                  if (_events.isEmpty)
                    const EmptyState(
                      title: 'No Events Found',
                      message:
                          'No events matching your selected criteria.',
                      icon: Icons.event_busy_outlined,
                    )
                  else
                    SizedBox(
                      height: 305,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding:
                            const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: _events.length,
                        itemBuilder: (context, index) {
                          final event = _events[index];
                          return SizedBox(
                            width: 220,
                            child: Padding(
                              padding:
                                  const EdgeInsets.only(right: 14),
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

                  // Popular Services
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0),
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
                          onPressed: () =>
                              context.push('/customer/services'),
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
                      padding:
                          const EdgeInsets.symmetric(horizontal: 20),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisExtent: 210,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: _services.length > 4
                          ? 4
                          : _services.length,
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

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Full-width integrated gradient hero with header icons + greeting.
class _HeroSection extends StatelessWidget {
  final double topPadding;
  final String userName;
  final CartService cartService;
  final VoidCallback onCartPressed;
  final VoidCallback onNotificationsPressed;

  const _HeroSection({
    required this.topPadding,
    required this.userName,
    required this.cartService,
    required this.onCartPressed,
    required this.onNotificationsPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFF4C1D95), // deep purple
            Color(0xFF7C3AED), // mid purple
            Color(0xFFDB2777), // magenta
            Color(0xFFFF6B8B), // soft pink
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(30),
          bottomRight: Radius.circular(30),
        ),
      ),
      child: Stack(
        children: [
          // Subtle decorative glow circles for depth
          Positioned(
            top: topPadding + 10,
            right: -30,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    Colors.white.withValues(alpha: 0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 10,
            left: -20,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    Colors.white.withValues(alpha: 0.05),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Hero content
          Padding(
            padding: EdgeInsets.only(
              top: topPadding + 14,
              left: 20,
              right: 12,
              bottom: 28,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── TOP ROW: JoyEvents + Cart & Bell ──
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'JoyEvents',
                      style: GoogleFonts.poppins(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    Row(
                      children: [
                        // Cart icon with badge
                        ListenableBuilder(
                          listenable: cartService,
                          builder: (context, _) {
                            final count = cartService.itemCount;
                            return Stack(
                              alignment: Alignment.center,
                              children: [
                                IconButton(
                                  icon: const Icon(
                                    Icons.shopping_bag_outlined,
                                    color: Colors.white,
                                    size: 24,
                                  ),
                                  onPressed: onCartPressed,
                                ),
                                if (count > 0)
                                  Positioned(
                                    right: 6,
                                    top: 6,
                                    child: Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: const BoxDecoration(
                                        color: AppTheme.accentColor,
                                        shape: BoxShape.circle,
                                      ),
                                      constraints: const BoxConstraints(
                                        minWidth: 16,
                                        minHeight: 16,
                                      ),
                                      child: Text(
                                        '$count',
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            );
                          },
                        ),
                        // Notification bell
                        IconButton(
                          icon: const Icon(
                            Icons.notifications_none_rounded,
                            color: Colors.white,
                            size: 24,
                          ),
                          onPressed: onNotificationsPressed,
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 18),

                // ── GREETING ──
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hello,',
                        style: GoogleFonts.poppins(
                          fontSize: 15,
                          fontWeight: FontWeight.w400,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$userName 👋',
                        style: GoogleFonts.poppins(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          height: 1.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Plan your next big event today',
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                          color: Colors.white.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

